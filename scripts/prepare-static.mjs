import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const excludedFiles = new Set(['precache.json', 'sw.js']);

function toCachePath(relativePath) {
  return `./${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

async function listStaticFiles(directory, relativeDirectory = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Static bundle must not contain a symbolic link: ${relativePath}`);
    if (entry.isDirectory()) {
      files.push(...await listStaticFiles(fullPath, relativePath));
    } else if (entry.isFile() && !excludedFiles.has(relativePath.replaceAll('\\', '/'))) {
      files.push(relativePath);
    }
  }
  return files;
}

async function buildPrecache() {
  const stylesheet = `body{margin:0;background:#101b23;color:#e6ece8;font:16px/1.7 system-ui,sans-serif}main{max-width:900px;margin:5vh auto;padding:28px}h1,h2,h3{font-family:Georgia,serif;line-height:1.25}h1{font-size:40px}h2{margin-top:36px}a{color:#8cdbca}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;border:1px solid #40505a;text-align:left}pre{overflow:auto;background:#1b2933;padding:16px}code{overflow-wrap:anywhere}img{max-width:100%}`;
  for (const [source, output, title] of [['docs/01_RULES.md', 'rules.html', 'Rift Chess rules'], ['docs/02_PLAY_GUIDE.md', 'guide.html', 'Rift Chess play guide']]) {
    const markdown = await fs.readFile(path.join(projectRoot, source), 'utf8');
    let html = await marked.parse(markdown);
    html = html.replaceAll('href="01_RULES.md"', 'href="rules.html"').replaceAll('href="02_PLAY_GUIDE.md"', 'href="guide.html"');
    html = html.replace(/href="((?:\.\.\/)?(?:docs\/)?[\w/-]+\.md[^\"]*)"/g, (_match, file) => `href="https://github.com/HaileyStorm/rift-chess/blob/main/docs/${file.replace(/^(\.\.\/)?docs\//, '').replace(/^\.\.\//, '')}"`);
    await fs.writeFile(path.join(distRoot, output), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${stylesheet}</style></head><body><main><a href="./index.html">← Return to the game</a>${html}</main></body></html>`);
  }
  const supportPage = path.join(distRoot, 'support.html');
  try {
    const supportMetadata = await fs.stat(supportPage);
    if (!supportMetadata.isFile()) throw new Error('support.html is not a file');
  } catch {
    throw new Error('Expected Vite output dist/support.html before preparing the offline cache.');
  }

  const files = (await listStaticFiles(distRoot)).sort((left, right) => left.localeCompare(right));
  const digest = createHash('sha256');
  const workerSource = await fs.readFile(path.join(projectRoot, 'public/sw.js'), 'utf8');
  digest.update(workerSource);
  for (const relativePath of files) {
    digest.update(relativePath.replaceAll('\\', '/'));
    digest.update('\0');
    digest.update(await fs.readFile(path.join(distRoot, relativePath)));
    digest.update('\0');
  }

  const manifest = {
    version: digest.digest('hex').slice(0, 20),
    assets: files.map(toCachePath),
  };
  await fs.writeFile(path.join(distRoot, 'precache.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(distRoot, 'sw.js'), workerSource.replace('__RIFT_CACHE_VERSION__', manifest.version));
  return manifest;
}

buildPrecache().then((manifest) => {
  process.stdout.write(`Prepared ${manifest.assets.length} offline assets (${manifest.version}).\n`);
});
