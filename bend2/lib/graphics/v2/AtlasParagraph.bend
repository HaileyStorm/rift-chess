# DRAFT adapter for the existing packaged atlas, not a new font/shaping rule.
# Scalar source indices count CRLF as two codepoints but one logical line break.
# For native-size or shaped fonts supply TextLayout.Item metrics directly.
import Base
import ./AtlasText.bend as Atlas
import ./FontData.bend as Font
import ./TextLayout.bend as Text
import ./Shapes.bend as Shapes

def item(+code: U32,+source: U32,end: U32,+scale: U32,previous: U32) -> Text.Item:
  match code:
    case 32: Text.Space{source,end,U32.mul(Atlas.advance(Font.glyph(32)),scale)}
    case 9: Text.Tab{source,end}
    case _:
      Text.Glyph{source,end,code,U32.mul(Atlas.advance(Font.glyph(code)),scale),
        Shapes.Neg{U32.mul(Atlas.kerning(previous,code),scale)}}

# Metrics are produced once; there is no per-pixel string/font lookup.
def items(text: String,+scale: U32,+source: U32,previous: U32) -> List<&2,Text.Item>:
  match text:
    case SNil{}: Nil{}
    case SCon{Chr{13},SCon{Chr{10},tail}}:
      +end = U32.add(source,2)
      Con{Text.Break{source,end},items(tail,scale,end,0)}
    case SCon{Chr{13},tail}:
      +end = U32.add(source,1)
      Con{Text.Break{source,end},items(tail,scale,end,0)}
    case SCon{Chr{10},tail}:
      +end = U32.add(source,1)
      Con{Text.Break{source,end},items(tail,scale,end,0)}
    case SCon{Chr{+code},tail}:
      +end = U32.add(source,1)
      Con{item(code,source,end,scale,previous),items(tail,scale,end,code)}

def prepare_valid(valid: Bool,text: String,scale: U32,settings: Text.Settings) -> Maybe<&2,Text.Layout>:
  match valid:
    case False{}: None{}
    case True{}: Some{Text.layout(items(text,scale,0,0),settings)}

def prepare(text: String,+scale: U32,settings: Text.Settings) -> Maybe<&2,Text.Layout>:
  prepare_valid(Bool.and(U32.is_ge(scale,1),U32.is_le(scale,4)),text,scale,settings)

def draw_glyphs(run: List<&2,Text.Placement>,+depth: Nat,+size: U32,+x: U32,+y: U32,
  +scale: U32,+ink: U32,image: Image) -> Image:
  match run:
    case Nil{}: image
    case Con{Text.Placement{source,end,key,px,py,line},tail}:
      draw_glyphs(tail,depth,size,x,y,scale,ink,
        Atlas.draw_glyph(depth,size,Font.glyph(key),U32.add(x,px),U32.add(y,py),scale,ink,image))

# Offset and scale are caller-owned presentation choices. This adapter preserves
# old atlas coverage; cache a static paragraph image when its text does not change.
def draw(layout: Text.Layout,depth: Nat,size: U32,x: U32,y: U32,scale: U32,ink: U32,image: Image) -> Image:
  match layout:
    case Text.Layout{glyphs,carets,metrics}: draw_glyphs(glyphs,depth,size,x,y,scale,ink,image)
