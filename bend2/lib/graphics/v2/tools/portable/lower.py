#!/usr/bin/env python3
"""EXPERIMENTAL execution harness for a small pure Bend syntax subset.

NOT the Bend compiler, checker, ownership/termination validator or native runtime.
Used only when the pinned compiler is absent. It translates source expressions,
pattern matches and sequential/parallel-let syntax into serial JavaScript. The
same independent pixel suite must later run through the pinned Bend wrapper.
Unsupported syntax fails at load time for a requested reachable definition.
No generated output is a distributable/runtime library build.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

TOKEN = re.compile(r'\s*(?:(\d+\.\d+(?:[eE][+-]?\d+)?|\d+n|\d+)|(\"(?:\\.|[^\"])*\")|([A-Za-z_][A-Za-z_0-9.?]*)|(<&>|==|!=|>=|<=|&&|\|\||<>|\+\+|->|[^\s]))')
def tokens(s):
    out=[]; pos=0
    while pos<len(s):
        if not s[pos:].strip(): break
        m=TOKEN.match(s,pos)
        if not m: raise ValueError(f'Cannot tokenize: {s[pos:]}')
        out.append(next(x for x in m.groups() if x is not None)); pos=m.end()
    return out

def split_top(s, delim=','):
    out=[]; start=0; stack=[]; quoted=False; escape=False
    for i,c in enumerate(s):
        if quoted:
            if escape: escape=False
            elif c=='\\':escape=True
            elif c=='"':quoted=False
            continue
        if c=='"':quoted=True
        elif c in '([{<':stack.append(c)
        elif c in ')]}>':
            if stack:stack.pop()
        elif c==delim and not stack:out.append(s[start:i].strip());start=i+1
    out.append(s[start:].strip());return out

class Expr:
    precedence={'||':1,'&&':2,'==':3,'!=':3,'>':3,'<':3,'>=':3,'<=':3,'+':4,'-':4,'*':5,'/':5,'%':5}
    def __init__(self,s):self.t=tokens(s);self.i=0
    def pop(self):v=self.t[self.i];self.i+=1;return v
    def peek(self):return self.t[self.i] if self.i<len(self.t) else None
    def need(self,t):
        got=self.pop()
        if got!=t:raise ValueError(f'Expected {t}, got {got} in {self.t}')
    def typ(self,close):
        # Types are erased by this harness; it does NOT validate them.
        out=[];depth=0
        while self.peek() is not None:
            if self.peek()==close and depth==0:break
            t=self.pop();out.append(t)
            if t in ('(','{','<','['):depth+=1
            elif t in (')','}','>',']'):depth-=1
        return ''.join(out)
    def parse(self,prec=0):
        t=self.pop()
        if t=='(':
            n=self.parse()
            if self.peek()==':':self.pop();n=('scope',self.typ(')'),n)
            self.need(')')
        elif t=='{':
            n=self.parse();self.need(':');self.typ('}');self.need('}')
        elif t=='&':n=('literal',self.pop())
        elif t=='[':
            args=[]
            while self.peek()!=']':
                args.append(self.parse())
                if self.peek()==',':self.pop()
                else:break
            self.need(']');n=('list',args)
        elif t=='-':n=('op','-',('literal','0'),self.parse(6))
        elif re.fullmatch(r'\d+(?:\.\d+(?:[eE][+-]?\d+)?)?n?',t) or t.startswith('"'):n=('literal',t)
        elif re.fullmatch(r'[A-Za-z_][A-Za-z_0-9.?]*',t):
            if self.peek()=='!':raise ValueError('GPU bang not supported in serial harness')
            if self.peek() in ('(','{'):
                opening=self.pop();closing=')' if opening=='(' else '}';args=[]
                while self.peek()!=closing:
                    args.append(self.parse())
                    if self.peek()==',':self.pop()
                    else:break
                self.need(closing);n=('call' if opening=='(' else 'ctor',t,args)
            else:
                if t in ('List','Array','Maybe','Result') and self.peek()=='<':
                    self.pop();self.typ('>');self.need('>');n=('name','undefined')
                else:n=('name',t)
        else:raise ValueError(f'Unsupported expression token {t}: {self.t}')
        while self.peek() in self.precedence and self.precedence[self.peek()]>=prec:
            op=self.pop();n=('op',op,n,self.parse(self.precedence[op]+1))
        return n

def pattern(e):
    t=e.pop()
    if t in ('+','++'):return pattern(e)
    if t=='_':return ('wild',)
    if re.fullmatch(r'\d+n?',t):
        if e.peek() in ('+','++'):
            e.pop();name=e.pop();return ('succ',t,name)
        return ('literal',t)
    if e.peek()=='{':
        e.pop();args=[]
        while e.peek()!='}':
            args.append(pattern(e))
            if e.peek()==',':e.pop()
            else:break
        e.need('}');return ('ctor',t,args)
    return ('bind',t)

BUILTINS={'U32','F32','Nat','Bool','List','String','Char'}
BASE_CTORS={'Pix':['color'],'Qua':['tl','tr','bl','br'],'Nil':[],'Con':['head','tail'],'None':[],'Some':['value'],'True':[],'False':[],'Chr':['code'],'SNil':[],'SCon':['head','tail']}
class Lower:
    def __init__(self,root):self.root=Path(root).resolve();self.mods={};self.names={};self.generated={};self.used=set();self.n=0;self.match_id=0
    def load(self,path):
        path=Path(path).resolve()
        if path in self.mods:return self.mods[path]
        text=path.read_text();mod={'path':path,'imports':{},'ctors':{},'defs':{},'hash':hashlib.sha256(path.read_bytes()).hexdigest()};self.mods[path]=mod
        for imp,alias in re.findall(r'^import\s+(\S+)\s+as\s+(\w+)\s*$',text,re.M):mod['imports'][alias]=self.load(path.parent/imp)
        lines=text.splitlines();i=0
        while i<len(lines):
            if lines[i].startswith('type '):
                i+=1;block=[]
                while i<len(lines) and (not lines[i].strip() or lines[i].startswith(' ')):
                    block.append(lines[i]);i+=1
                for name,fs in re.findall(r'(\w+)\{([^{}]*)\}', '\n'.join(block)):
                    fields=[f.split(':',1)[0].strip() for f in split_top(fs) if f.strip()];mod['ctors'][name]=fields
                continue
            if lines[i].startswith('def '):
                header=lines[i];i+=1
                while not header.rstrip().endswith(':'):
                    header+=' '+lines[i].strip();i+=1
                m=re.match(r'def ([A-Za-z_0-9.?]+)\(',header)
                if not m:raise ValueError(header)
                name=m.group(1);p0=header.index('(');d=1;j=p0+1
                while d:
                    if header[j]=='(':d+=1
                    if header[j]==')':d-=1
                    j+=1
                params=[];erased=[]
                for entry in split_top(header[p0+1:j-1]):
                    if not entry:continue
                    arg=entry.split(':',1)[0].strip()
                    if arg.startswith('~'):raise ValueError('Templates not supported: '+header)
                    if arg.startswith('-'):erased.append(len(params))
                    params.append(arg.lstrip('+-'))
                body=[]
                while i<len(lines) and (not lines[i].strip() or lines[i].startswith(' ')):
                    body.append(lines[i]);i+=1
                mod['defs'][name]=(params,erased,body)
                self.names[(path,name)]=f'f{self.n}';self.n+=1
                continue
            i+=1
        return mod
    def resolve(self,mod,name):
        first,sep,rest=name.partition('.')
        if sep and first in mod['imports']:return self.resolve(mod['imports'][first],rest)
        if name not in mod['defs']:raise ValueError(f'Unknown function {name} in {mod["path"]}')
        self.compile(mod,name)
        return self.names[(mod['path'],name)]
    def ctor(self,mod,name):
        first,sep,rest=name.partition('.')
        if sep and first in mod['imports']:return self.ctor(mod['imports'][first],rest)
        fields=mod['ctors'].get(name,BASE_CTORS.get(name))
        if fields is None:raise ValueError(f'Unknown constructor {name} in {mod["path"]}')
        return name,fields
    def expr(self,n,mod,scope='Nat'):
        kind=n[0]
        if kind=='literal':return n[1]
        if kind=='name':return n[1]
        if kind=='scope':return self.expr(n[2],mod,n[1])
        if kind=='list':
            out='({$:"Nil"})'
            for a in reversed(n[1]):out='({$:"Con",head:'+self.expr(a,mod,scope)+',tail:'+out+'})'
            return out
        if kind=='op':
            names={'+':'add','-':'sub','*':'mul','/':'div','%':'mod','<':'is_lt','>':'is_gt','<=':'is_le','>=':'is_ge','==':'is_eq','!=':'is_ne','&&':'and','||':'or'}
            ty='Bool' if n[1] in ('&&','||') else scope
            return f'{ty}.{names[n[1]]}({self.expr(n[2],mod,scope)},{self.expr(n[3],mod,scope)})'
        if kind=='ctor':
            name,fields=self.ctor(mod,n[1]);args=n[2]
            if len(args)!=len(fields):raise ValueError('Constructor arity: '+n[1])
            if name=='True':return 'true'
            if name=='False':return 'false'
            return '({$:'+json.dumps(name)+''.join(','+f+':'+self.expr(a,mod,scope) for f,a in zip(fields,args))+'})'
        if kind=='call':
            name=n[1];args=n[2]
            if name=='Bool.pick':args=args[1:]
            elif name in ('List.reverse','List.length'):args=args[2:]
            first=name.split('.')[0]
            fn=name if first in BUILTINS else self.resolve(mod,name)
            return fn+'('+','.join(self.expr(a,mod,scope) for a in args)+')'
        raise ValueError(n)
    def expression(self,s,mod):
        e=Expr(s);n=e.parse()
        if e.peek() is not None:raise ValueError(f'Unconsumed tokens {e.t[e.i:]} in {s}')
        return self.expr(n,mod)
    def pats(self,p,value,mod,conds,binds):
        kind=p[0]
        if kind=='wild':return
        if kind=='bind':binds.append(f'const {p[1]}={value};');return
        if kind=='literal':conds.append(f'{value}==={p[1]}');return
        if kind=='succ':conds.append(f'{value}>={p[1]}');binds.append(f'const {p[2]}={value}-{p[1]};');return
        name,fields=self.ctor(mod,p[1]);args=p[2]
        if len(fields)!=len(args):raise ValueError(f'Pattern arity: {p}')
        if name in ('True','False'):conds.append(f'{value}==={name.lower()}');return
        conds.append(f'({value}&&{value}.$==={json.dumps(name)})')
        for f,a in zip(fields,args):self.pats(a,f'{value}.{f}',mod,conds,binds)
    def logical(self,lines):
        out=[];pending='';indent=0;balance=0
        for line in lines:
            # Code in this subset has no # inside source strings.
            stripped=line.split('#',1)[0].strip()
            if not stripped:continue
            if not pending:indent=len(line)-len(line.lstrip())
            pending+=(' ' if pending else '')+stripped
            ts=tokens(stripped)
            balance+=sum(t in ('(','{','[') for t in ts)-sum(t in (')','}',']') for t in ts)
            if balance==0:out.append((indent,pending));pending=''
        if pending or balance:raise ValueError('Unbalanced source')
        return out
    def block(self,lines,mod):
        code=[];i=0
        while i<len(lines):
            indent,line=lines[i]
            if line.startswith('match '):
                vs=line[6:-1].split();i+=1;branches=[]
                # Pattern fields may legally shadow a scrutinee (Rows{rows}).
                # Capture before entering the branch's lexical binding scope.
                captures=[]
                for v in vs:
                    name=f'__review_match_{self.match_id}';self.match_id+=1
                    code.append(f'const {name}={v};');captures.append(name)
                vs=captures
                while i<len(lines) and lines[i][0]>indent:
                    ci,case=lines[i]
                    if not case.startswith('case '):raise ValueError('Expected case '+case)
                    # Colon after complete constructor patterns (patterns have no types).
                    text,inline=case[5:].split(':',1);e=Expr(text);ps=[]
                    while e.peek() is not None:ps.append(pattern(e))
                    if len(ps)!=len(vs):raise ValueError('Match arity '+case)
                    conds=[];binds=[]
                    for p,v in zip(ps,vs):self.pats(p,v,mod,conds,binds)
                    i+=1;body=[]
                    if inline.strip():body=[(ci+2,inline.strip())]
                    else:
                        while i<len(lines) and lines[i][0]>ci:body.append(lines[i]);i+=1
                    branches.append((' && '.join(conds) or 'true','\n'.join(binds)+'\n'+self.block(body,mod)))
                for k,(cond,body) in enumerate(branches):code.append(('if' if k==0 else 'else if')+f'({cond}){{\n{body}\n}}')
                code.append('else {throw new Error("Unmatched pattern in source harness");}')
                continue
            ass=re.match(r'^([+\w]+(?:\s+[+\w]+)*)\s*=\s*(.+)$',line)
            if ass:
                names=[n.lstrip('+') for n in ass.group(1).split()];exprs=[]
                e=Expr(ass.group(2))
                while e.peek() is not None:exprs.append(e.parse())
                i+=1
                while len(exprs)<len(names):
                    if i>=len(lines) or lines[i][0]<=indent:raise ValueError('Missing parallel operand '+line)
                    e=Expr(lines[i][1]);i+=1
                    while e.peek() is not None:exprs.append(e.parse())
                if len(exprs)!=len(names):raise ValueError('Parallel arity '+line)
                # Sibling bindings are intentionally not exposed to each other.
                vals=[self.expr(e,mod) for e in exprs]
                if len(names)>1:
                    code.append('{ const values=['+','.join(vals)+'];')
                    # Preserve outer captures and then assign siblings together.
                    code[-1]='const ['+','.join(names)+']=['+','.join(vals)+'];'
                else:code.append('const '+names[0]+'='+vals[0]+';')
                continue
            if i!=len(lines)-1:raise ValueError('Unexpected non-final expression '+line)
            code.append('return '+self.expression(line,mod)+';');i+=1
        return '\n'.join(code)
    def compile(self,mod,name):
        key=(mod['path'],name)
        if key in self.used:return
        self.used.add(key);params,erased,body=mod['defs'][name]
        if erased:raise ValueError('Erased user arguments not supported: '+name)
        try:code=self.block(self.logical(body),mod)
        except Exception as ex:raise ValueError(f'{mod["path"]}:{name}: {ex}') from ex
        label=str(mod['path'].relative_to(self.root))+':'+name
        self.generated[key]=f'function {self.names[key]}({",".join(params)}){{\nif(COUNTS) COUNTS[{json.dumps(label)}]=(COUNTS[{json.dumps(label)}]||0)+1;\n{code}\n}}\n'
    def emit(self,entry,exports,out):
        mod=self.load(entry)
        for name in exports:self.compile(mod,name)
        runtime=(Path(__file__).parent/'runtime.mjs').read_text()
        funcs='\n'.join(self.generated[k] for k in sorted(self.generated,key=lambda k:self.names[k]))
        mapping=','.join(json.dumps(n)+':'+self.names[(mod['path'],n)] for n in exports)
        manifest={str(p.relative_to(self.root)):m['hash'] for p,m in self.mods.items()}
        Path(out).write_text(runtime+'\n'+funcs+'\nexport default {'+mapping+'};\nexport const sourceHashes='+json.dumps(manifest)+';\n')
        return {'entry':str(entry),'exports':exports,'reachable_functions':len(self.used),'source_hashes':manifest,'harness_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'runtime_sha256':hashlib.sha256((Path(__file__).parent/'runtime.mjs').read_bytes()).hexdigest(),'generated_js_sha256':hashlib.sha256(Path(out).read_bytes()).hexdigest(),'scope':'NON-AUTHORITATIVE serial JS source-subset harness; no Bend check/ownership/proof/backend evidence'}

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('root');ap.add_argument('entry');ap.add_argument('output');ap.add_argument('exports',nargs='+');a=ap.parse_args()
    print(json.dumps(Lower(a.root).emit(Path(a.root)/a.entry,a.exports,a.output),indent=2))
