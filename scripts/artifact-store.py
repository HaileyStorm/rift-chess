"""Explicit, hash-bound lossless artifact retirement. No age-based cleanup.

Archive: python scripts/artifact-store.py archive PLAN --sha256 PLAN_SHA
Restore: python scripts/artifact-store.py restore STORE RELATIVE_PATH
Cache:   python scripts/artifact-store.py cache PLAN --sha256 PLAN_SHA
All paths are relative to this checkout's .artifacts. Restore never overwrites.
Interrupted archives require explicit --recover-pending after inspecting their
retained pending payloads. Interrupted cache runs require a new reviewed plan for
remaining files; retain the original plan and cache-retirement-*.jsonl journals.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import stat
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / '.artifacts'
CHUNK = 1024 * 1024


def safe(relative, base=ARTIFACTS):
    parts = Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(p in ('..', '.') for p in parts):
        raise ValueError('Expected an artifact-relative path')
    target = base.joinpath(*parts)
    for p in (base, *[base.joinpath(*parts[:i]) for i in range(1, len(parts) + 1)]):
        if p.exists():
            s = p.lstat()
            if stat.S_ISLNK(s.st_mode) or getattr(s, 'st_file_attributes', 0) & 1024:
                raise ValueError(f'Link/reparse target refused: {p}')
    if not target.resolve().is_relative_to(base.resolve()):
        raise ValueError('Artifact boundary violation')
    return target


def digest(stream):
    h = hashlib.sha256()
    size = 0
    while block := stream.read(CHUNK):
        h.update(block)
        size += len(block)
    return h.hexdigest(), size


def identity(s):
    return s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns


def checked_source(entry):
    p = safe(entry['path'])
    s = p.stat()
    if not stat.S_ISREG(s.st_mode) or s.st_size != entry['bytes'] or s.st_mtime_ns != entry['mtimeNs']:
        raise ValueError(f'Source changed since plan: {p}')
    return p, identity(s)


def authority(plan, entries=None):
    if os.environ.get('CODEX_THREAD_ID') != plan['ownerTask']:
        raise ValueError('Cleanup requires the owning task')
    snapshots = {}
    reservations = []
    for directory, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules') and
                   not (Path(directory) / d).is_symlink() and
                   not getattr((Path(directory) / d).lstat(), 'st_file_attributes', 0) & 1024]
        if '.working' in files:
            p = Path(directory) / '.working'
            raw = p.read_bytes()
            snapshots[p] = hashlib.sha256(raw).hexdigest()
            for claim in json.loads(raw)['claims']:
                for reservation in claim['reservations']:
                    reservations.append((claim['task_id'], reservation))
    for entry in (entries if entries is not None else plan['archiveFiles'] + plan['cacheFiles']) + [{'path': plan['store']}]:
        path = '.artifacts/' + Path(entry['path']).as_posix()
        owned = False
        for owner, r in reservations:
            rpath = r['path'].rstrip('/')
            covers = path == rpath or (r['kind'] == 'tree' and path.startswith(rpath + '/'))
            overlaps = covers or rpath.startswith(path + '/')
            if overlaps and owner != plan['ownerTask']:
                raise ValueError(f'Foreign reservation: {path}')
            owned |= covers and owner == plan['ownerTask']
        if not owned:
            raise ValueError(f'Unclaimed target: {path}')
    return snapshots


def unchanged_claims(snapshots):
    for path, expected in snapshots.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Ownership changed: {path}')


def connect(store):
    store.mkdir(exist_ok=True)
    for name in ('index.sqlite', 'index.sqlite-journal', 'index.sqlite-wal', 'index.sqlite-shm'):
        safe(name, store)
    db = sqlite3.connect(safe('index.sqlite', store))
    db.execute('PRAGMA synchronous=FULL')
    db.execute('CREATE TABLE IF NOT EXISTS originals(path TEXT PRIMARY KEY, sha256 TEXT, bytes INTEGER, mtime_ns INTEGER, retired INTEGER DEFAULT 0)')
    db.commit()
    return db


def payload(store, sha):
    return safe(f'blobs/{sha[:2]}/{sha}.gz', store)


def verify_blob(blob, sha, size):
    with gzip.open(blob, 'rb') as stream:
        actual = digest(stream)
    if actual != (sha, size):
        raise ValueError(f'Archive verification failed: {blob}')


def archive(plan, snapshots, recover_pending=False):
    store = safe(plan['store'])
    db = connect(store)
    marker = safe('plan.json', store)
    if marker.exists():
        if json.loads(marker.read_text()) != plan:
            raise ValueError('Store belongs to another plan')
    else:
        with marker.open('x', encoding='utf8') as out:
            json.dump(plan, out)
            out.flush()
            os.fsync(out.fileno())
    retired = saved = 0
    started = time.monotonic()
    verified = set()
    for i, entry in enumerate(plan['archiveFiles']):
        if i % 100 == 0:
            unchanged_claims(snapshots)
        old = db.execute('SELECT sha256,bytes,mtime_ns,retired FROM originals WHERE path=?', (entry['path'],)).fetchone()
        source = safe(entry['path'])
        if not source.exists():
            if not old or old[1:3] != (entry['bytes'], entry['mtimeNs']):
                raise ValueError(f'Missing source without archive: {source}')
            verify_blob(payload(store, old[0]), old[0], old[1])
            continue
        source, before = checked_source(entry)
        with source.open('rb') as stream:
            sha, size = digest(stream)
            if identity(os.fstat(stream.fileno())) != before:
                raise ValueError('Source changed while hashing')
        if old and old[:3] != (sha, size, entry['mtimeNs']):
            raise ValueError('Existing index conflicts with source')
        blob = payload(store, sha)
        cost = 0
        if not blob.exists():
            blob.parent.mkdir(parents=True, exist_ok=True)
            temporary = safe(str(blob.relative_to(store).with_suffix('.pending')), store)
            if temporary.exists():
                if not recover_pending:
                    raise ValueError('Pending payload retained; inspect before explicit --recover-pending')
                try:
                    verify_blob(temporary, sha, size)
                except (OSError, ValueError, EOFError):
                    retained = safe(str(temporary.relative_to(store)) + f'.incomplete-{time.time_ns()}', store)
                    os.rename(temporary, retained)
            if not temporary.exists():
                with temporary.open('xb') as raw:
                    with gzip.GzipFile(fileobj=raw, mode='wb', filename='', mtime=0, compresslevel=6) as out:
                        with source.open('rb') as stream:
                            while block := stream.read(CHUNK):
                                out.write(block)
                    raw.flush()
                    os.fsync(raw.fileno())
            verify_blob(temporary, sha, size)
            os.rename(temporary, blob)
            cost = blob.stat().st_size
        if sha not in verified:
            verify_blob(blob, sha, size)
            verified.add(sha)
        db.execute('INSERT OR IGNORE INTO originals(path,sha256,bytes,mtime_ns) VALUES(?,?,?,?)',
                   (entry['path'], sha, size, entry['mtimeNs']))
        db.commit()  # Durable restore mapping precedes every retirement.
        readback = db.execute('SELECT sha256,bytes,mtime_ns FROM originals WHERE path=?', (entry['path'],)).fetchone()
        if readback != (sha, size, entry['mtimeNs']) or identity(source.stat()) != before:
            raise ValueError('Source/index changed before retirement')
        source.unlink()  # Exact unchanged file only; no recursive removal.
        db.execute('UPDATE originals SET retired=1 WHERE path=?', (entry['path'],))
        db.commit()
        retired += 1
        saved += size - cost
        if (i + 1) % 1000 == 0:
            print(json.dumps({'processed': i + 1, 'retired': retired, 'netPayloadSavedBytes': saved}), flush=True)
    unchanged_claims(snapshots)
    result = {'retiredFiles': retired, 'netPayloadSavedBytes': saved, 'seconds': round(time.monotonic() - started, 2),
              'indexedFiles': db.execute('SELECT COUNT(*) FROM originals').fetchone()[0]}
    db.close()
    return result


def restore(store_name, relative):
    store = safe(store_name)
    marker = json.loads(safe('plan.json', store).read_text())
    if Path(marker['store']).as_posix() != Path(store_name).as_posix():
        raise ValueError('Archive marker names another store')
    temporary_relative = str(Path(relative).with_name(Path(relative).name + '.restore-pending'))
    current_authority = {**marker, 'ownerTask': os.environ.get('CODEX_THREAD_ID')}
    if not current_authority['ownerTask']:
        raise ValueError('Restore requires a current owning task')
    snapshots = authority(current_authority, [{'path': relative}, {'path': temporary_relative}])
    for name in ('index.sqlite', 'index.sqlite-journal', 'index.sqlite-wal', 'index.sqlite-shm'):
        safe(name, store)
    db = sqlite3.connect(f'file:{safe("index.sqlite", store).as_posix()}?mode=ro', uri=True)
    row = db.execute('SELECT sha256,bytes,mtime_ns FROM originals WHERE path=?', (relative,)).fetchone()
    db.close()
    if not row:
        raise ValueError('Path absent from archive index')
    sha, size, mtime = row
    target = safe(relative)
    if target.exists():
        raise ValueError('Restore target already exists; refusing overwrite')
    blob = payload(store, sha)
    verify_blob(blob, sha, size)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = safe(str(target.relative_to(ARTIFACTS).with_name(target.name + '.restore-pending')))
    with temporary.open('xb') as out, gzip.open(blob, 'rb') as stream:
        while block := stream.read(CHUNK):
            out.write(block)
        out.flush()
        os.fsync(out.fileno())
    with temporary.open('rb') as stream:
        if digest(stream) != (sha, size):
            raise ValueError('Restored bytes mismatch')
    # Hard link gives atomic no-overwrite publication, including on Windows NTFS.
    unchanged_claims(snapshots)
    os.link(temporary, target)
    temporary.unlink()
    os.utime(target, ns=(mtime, mtime))
    return {'restored': relative, 'sha256': sha, 'bytes': size}


def cache(plan, snapshots):
    if sys.platform != 'win32':
        raise ValueError('Cache process check is Windows-specific')
    profiles = []
    for root in plan['cacheRoots']:
        p = safe(root)
        if p.name not in ('GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache') or '/profile/' not in root:
            raise ValueError('Not an eligible GPU cache')
        profiles.append(str(safe(root.split('/profile/', 1)[0] + '/profile')).lower())

    def check_processes():
        command = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'chrome|electron|chess' } | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"
        r = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command],
                           capture_output=True, text=True, check=True, timeout=15, creationflags=subprocess.CREATE_NO_WINDOW)
        processes = json.loads(r.stdout) if r.stdout.strip() else []
        if isinstance(processes, dict):
            processes = [processes]
        for proc in processes:
            if not proc.get('CommandLine'):
                raise ValueError('Relevant browser process has unavailable command line')
            commandline = proc['CommandLine'].lower().replace('/', '\\')
            if any(profile in commandline for profile in profiles):
                raise ValueError('Approved cache profile has a live browser process')
        return len(processes)
    retired = total = 0
    store = safe(plan['store'])
    plan_hash = hashlib.sha256(json.dumps(plan, sort_keys=True).encode()).hexdigest()
    with safe(f'cache-retirement-{plan_hash}-{time.time_ns()}.jsonl', store).open('x', encoding='utf8') as journal:
        for i, entry in enumerate(plan['cacheFiles']):
            if i % 100 == 0:
                processes_checked = check_processes()
            unchanged_claims(snapshots)
            if not any(entry['path'].startswith(root + '/') for root in plan['cacheRoots']):
                raise ValueError('Cache file outside approved roots')
            p, before = checked_source(entry)
            journal.write(json.dumps({'path': entry['path'], 'bytes': entry['bytes'], 'state': 'intent'}) + '\n')
            journal.flush()
            os.fsync(journal.fileno())
            if identity(p.stat()) != before:
                raise ValueError('Cache file changed')
            p.unlink()
            retired += 1
            total += entry['bytes']
            journal.write(json.dumps({'path': entry['path'], 'state': 'removed'}) + '\n')
            journal.flush()
            os.fsync(journal.fileno())
    return {'cacheFilesRemoved': retired, 'cacheBytesRemoved': total, 'processesChecked': processes_checked}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['archive', 'restore', 'cache'])
    parser.add_argument('path')
    parser.add_argument('relative', nargs='?')
    parser.add_argument('--sha256')
    parser.add_argument('--recover-pending', action='store_true')
    args = parser.parse_args()
    if args.action == 'restore':
        result = restore(args.path, args.relative)
    else:
        raw = Path(args.path).read_bytes()
        if not args.sha256 or hashlib.sha256(raw).hexdigest() != args.sha256:
            raise ValueError('Explicit unchanged plan hash required')
        plan = json.loads(raw)
        if plan['schema'] != 'rift-artifact-cleanup/1':
            raise ValueError('Unknown plan schema')
        snapshots = authority(plan)
        result = archive(plan, snapshots, args.recover_pending) if args.action == 'archive' else cache(plan, snapshots)
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
