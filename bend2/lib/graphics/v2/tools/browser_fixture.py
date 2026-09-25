"""Local-only browser fixture support: rebase static imports to data URLs.

The container's managed browser blocks ALL navigations. This harness uses an
about:blank document and in-memory scripts/data-URL module workers, without changing policy.
Only fixture import URLs/application endpoint injection change, not library logic.
"""
from pathlib import Path
import base64,hashlib,re
ROOT=Path(__file__).resolve().parents[5]
CACHE={};RECORDS=[]

def module_url(path: Path,app: bool=False) -> str:
    """Rebase this fixture's static ESM dependencies; reject escaping paths/cycles."""
    path=path.resolve()
    if path in CACHE:return CACHE[path]
    if ROOT not in path.parents:raise ValueError(f'Outside checkpoint: {path}')
    source=path.read_text();text=source
    if app:
        text=text.replace("taskModule:new URL('./task.mjs',import.meta.url)","workerURL:window.__workerURL,taskModule:window.__taskURL")
    def replace(match):
        target=(path.parent/match.group(2)).resolve()
        return match.group(1)+module_url(target)+match.group(3)
    text=re.sub(r'''(from\s*['"])(\.[^'"]+)(['"])''',replace,text)
    value='data:text/javascript;base64,'+base64.b64encode(text.encode()).decode();CACHE[path]=value
    RECORDS.append({'source':str(path.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.encode()).hexdigest(),'runtime_sha256':hashlib.sha256(text.encode()).hexdigest(),'rebase':'static import specifiers only; app additionally injects explicit endpoint/task URLs' if app else 'static import specifiers only'})
    return value

def install(page) -> None:
    """Install the exact worker endpoint as a data-URL module worker and capture its task URL."""
    v=ROOT/'bend2/lib/graphics/v2'
    page.evaluate('''o=>{window.__workerURL='data:text/javascript;base64,'+btoa(o.code);window.__taskURL=o.task;}''',{'code':(v/'host/frame-worker.mjs').read_text(),'task':module_url(v/'review-third/demo/task.mjs')})
