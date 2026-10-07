import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { root, readSource, sha256, candidateCommit } from './selected-binding.mjs';

const here = 'bend2/toolchain-patches/2035/browser-tag-boundary.mjs';
const prefix = 'bend2/platform/browser/';
const assetsResponse = 'graphics/v2game/Assets.AssetResponse';
const piecesResponse = 'graphics/v2game/PieceAssets.AssetResponse';
const bare = Object.freeze(['Pix', 'Qua', 'Con', 'Nil', 'Some']);
const map = Object.freeze({
  Frame: 'graphics/Scene.Frame', Pieces: 'graphics/v2game/PieceSprites.Pieces',
  ObservatoryPlates: 'graphics/v2game/Assets.ObservatoryPlates', Ready: 'graphics/v2game/Assets.Ready',
  Texture: 'lib/graphics/v2/RgbaSample.Texture',
  QualityProbe: 'ui/Types.QualityProbe', Tick: 'ui/Types.Tick', Activate: 'ui/Types.Activate',
  PickFile: 'ui/Types.PickFile', PointerDown: 'ui/Types.PointerDown', PointerMove: 'ui/Types.PointerMove',
  PointerUp: 'ui/Types.PointerUp', Wheel: 'ui/Types.Wheel', KeyInput: 'ui/Types.KeyInput',
  Resize: 'ui/Types.Resize', PortError: 'ui/Types.PortError', FileText: 'ui/Types.FileText',
  Store: 'ui/Types.Store', Download: 'ui/Types.Download', Sound: 'ui/Types.Sound',
  OpenUrl: 'ui/Types.OpenUrl', Exit: 'ui/Types.Exit',
});
const ports = {
  'host.ts': { sha256: '813e50136a467a35542a8c39061f4d45f13138f4777eda9874c967df655334b5',
    counts: { QualityProbe: 1, Tick: 1, Activate: 1, PickFile: 1, PointerDown: 1,
      PointerMove: 1, PointerUp: 2, Wheel: 1, KeyInput: 1, Resize: 1 } },
  'ports.ts': { sha256: '60c995ceb06ac7fce3d1df7911ea63ae0e76ce811f72fd9925b09d8cbdbb2a22',
    counts: { PortError: 4, FileText: 1, Store: 1, Download: 1, PickFile: 1, Sound: 1, OpenUrl: 1, Exit: 1 } },
  'input-queue.ts': { sha256: '8f1a4124e0387bc7b532a96d92e6f13293effe5259f6f46de2015006ab463d31',
    counts: { PointerMove: 2 } },
  'worker-v2.ts': { sha256: 'f3a78f8c34270924620a56497bb145b0ebcb2569232cf91ad01a2de62b3384c5',
    counts: { Pieces: 1, ObservatoryPlates: 1, Ready: 1, Sound: 2 },
    bareCounts: { Con: 2, Nil: 1, Pix: 2, Qua: 2, Some: 1 } },
  'sprite-helper.ts': { sha256: '8c6752c471ae47ca2d29f5d6f9a211f967529e4d213c4f61faba223971ef1047',
    counts: { Ready: 2, Frame: 1, ObservatoryPlates: 1 },
    bareCounts: { Con: 2, Nil: 2, Pix: 3, Qua: 3, Some: 1 } },
  'pose-port.ts': { sha256: '6ffdcd5a70959261e14d79b69a086af0d1d65f12ac2dfc59627e89f268c92a60',
    counts: { Pieces: 2, Texture: 2 },
    bareCounts: { Pix: 4, Qua: 4 } },
  'asset-port.ts': { sha256: '2a2927c81f5b652685ee2cacb0608b4a7b3eb528fffc8322eebeaad6a215d3e0',
    counts: {}, bareCounts: { Nil: 1, Con: 1 } },
  'image-port.ts': { sha256: '2f8441468c243eda487a333ff7e0befbea624905325654d73d59e5de1d73484b',
    counts: {}, bareCounts: { Pix: 3, Qua: 6 } },
};
const definitions = {
  'bend2/ui/Types.bend': { sha256: 'd8f40447f58f9f825b9808128619c57a6cde14b3a67879e799c4fa9b3794c5ce',
    types: { Input: ['QualityProbe', 'Tick', 'Activate', 'PointerDown', 'PointerMove', 'PointerUp',
      'Wheel', 'KeyInput', 'Resize', 'PortError', 'FileText'],
    Effect: ['PickFile', 'Store', 'Download', 'Sound', 'OpenUrl', 'Exit'] } },
  'bend2/graphics/Scene.bend': { sha256: '7d0ce609c97ffae8b0662de2ec58d85120a9605c151c7becd5c91a60fa5cbc65',
    types: { Frame: ['Frame'] } },
  'bend2/graphics/v2game/PieceSprites.bend': { sha256: 'de3f1178280de74dead3143342f765d4eff1c1b7796a501543a90b120dac3c59',
    types: { Pieces: ['Pieces'] } },
  'bend2/lib/graphics/v2/RgbaSample.bend': { sha256: '7af8dfdd7343a1d3db0803bfb7df12162fc5b5bc3638c6688bbd356a0a6bf1bc',
    types: { Texture: ['Texture'] } },
  'bend2/graphics/v2game/Assets.bend': { sha256: '1bba5dcbef7a9f0628ffe470d02aab28dd5fd43a54d4b3688e656189c86e239a',
    types: { AssetResponse: ['AssetResponse'], Plate: ['Ready'], ObservatoryPlates: ['ObservatoryPlates'] } },
  'bend2/graphics/v2game/PieceAssets.bend': { sha256: 'aec2626edc09aa0fe4fcd30e67ce0c4c546a281e512ab58712694f06ba2ed951',
    types: { AssetResponse: ['AssetResponse'] } },
  '.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/base.bend': {
    sha256: 'c742fae9c49b14f0cc9128429a2c6109364c8a933a142f2c90b9f2e5fd976661',
    types: { Image: ['Pix', 'Qua'] } },
};
const emitted = {
  scene: ['scene-IptWcU', 'af1f28fa504626c8bb49d9e13fe1f963aa2eccfdb2e93d70933eacbfca303284'],
  controller: ['controller-vIjLP2', '708c83d9f666f400d2b0d2c3caf370516125e40895a12696c904ecdc4304e77e'],
  menu: ['menu-g2ud5O', '90bb363a280fffb5e2e592ca68cefd5c520092351cdba0e9792efc8200acad04'],
  chrome: ['chrome-knTtdv', 'e2fba28538b00f6c75a7768c2241d91736494bbd2f429c53611d0dbfd032b4f1'],
};
const occurrences = (source, text) => source.split(text).length - 1;
function replace(source, before, after, count) {
  assert.equal(occurrences(source, before), count, `browser boundary anchor/count changed: ${before}`);
  return source.split(before).join(after);
}
function boundBytes(relative, expected) {
  const bytes = readSource(path.join(root, relative));
  assert.equal(sha256(bytes), expected, `browser boundary preimage changed: ${relative}`);
  return bytes;
}

export function transformBrowserTags2035(relative, input) {
  assert.ok(relative.startsWith(prefix), 'candidate boundary only accepts browser ports');
  const name = relative.slice(prefix.length);
  const spec = ports[name];
  assert.ok(spec, `unsupported candidate browser port: ${relative}`);
  const bytes = Buffer.from(input);
  assert.equal(sha256(bytes), spec.sha256, `browser boundary preimage changed: ${relative}`);
  const source = bytes.toString('utf8');
  const allowed = new Set([...Object.keys(spec.counts), ...Object.keys(spec.bareCounts ?? {}),
    ...(name === 'asset-port.ts' ? ['AssetResponse'] : [])]);
  for (const literal of source.matchAll(/'([A-Z][A-Za-z_]*)'/g))
    assert.ok(allowed.has(literal[1]), `unsupported constructor-like literal in ${relative}: ${literal[1]}`);
  let contents = source;
  const changes = [];
  for (const [tag, count] of Object.entries(spec.counts)) {
    contents = replace(contents, `'${tag}'`, `'${map[tag]}'`, count);
    changes.push({ from: tag, to: map[tag], count });
  }
  if (name === 'asset-port.ts') {
    contents = replace(contents,
      'export async function loadAssetRequests(requests: any[]): Promise<any[]> {',
      `export async function loadAssetRequests(requests: any[], responseTag: '${assetsResponse}' | '${piecesResponse}' = '${assetsResponse}'): Promise<any[]> {`, 1);
    contents = replace(contents, "responses.push({ $: 'AssetResponse', id, bytes, ok });",
      'responses.push({ $: responseTag, id, bytes, ok });', 1);
    changes.push({ site: 'loadAssetRequests response constructor', default: assetsResponse,
      allowed: [assetsResponse, piecesResponse], count: 1 });
  }
  if (name === 'sprite-helper.ts') {
    contents = replace(contents, 'loadAssets?: (requests: any[]) => Promise<any[]>;',
      `loadAssets?: (requests: any[], responseTag?: '${assetsResponse}' | '${piecesResponse}') => Promise<any[]>;`, 1);
    contents = replace(contents, 'missingPieces ? fetchAssets(spriteRequests) : Promise.resolve([]),',
      `missingPieces ? fetchAssets(spriteRequests, '${piecesResponse}') : Promise.resolve([]),`, 1);
    assert.equal(occurrences(contents, 'plateRequests.length ? fetchAssets(plateRequests) : Promise.resolve([]),'), 1);
    changes.push({ site: 'sprite request transport call', responseTag: piecesResponse, count: 1 });
  }
  for (const [tag, count] of Object.entries(spec.bareCounts ?? {})) {
    assert.equal(occurrences(source, `'${tag}'`), count);
    assert.equal(occurrences(contents, `'${tag}'`), count, `Base tag changed: ${tag}`);
  }
  return { contents, loader: 'ts', metadata: { path: relative, sourceSha256: spec.sha256,
    resultSha256: sha256(contents), bytes: Buffer.byteLength(contents), changes,
    unchangedBaseLiteralCounts: spec.bareCounts ?? {} } };
}

export function browserTagBoundaryBinding2035() {
  const declared = Object.entries(definitions).map(([relative, spec]) => {
    const source = boundBytes(relative, spec.sha256).toString('utf8').replaceAll('\r\n', '\n');
    for (const [type, constructors] of Object.entries(spec.types)) {
      const match = new RegExp(`^type ${type}(?:<[^\\n]*>)? is [^\\n]+:\\n([\\s\\S]*?)(?=^(?:type|def|law) |$(?![\\s\\S]))`, 'm').exec(source);
      assert.ok(match, `source type declaration changed: ${relative}:${type}`);
      const actual = [...match[1].matchAll(/^  ([A-Z][A-Za-z_]*)\{/gm)].map(item => item[1]);
      for (const constructor of constructors)
        assert.ok(actual.includes(constructor), `source constructor changed: ${relative}:${constructor}`);
    }
    return { path: relative, sha256: spec.sha256, types: spec.types };
  });
  const generated = Object.entries(emitted).map(([name, [directory, expected]]) => {
    const relative = `.artifacts/bend2/2035-preview/${directory}/${name}.js`;
    const source = boundBytes(relative, expected).toString('utf8');
    const publicTags = [...bare, ...Object.values(map), assetsResponse, piecesResponse];
    return { module: name, path: relative, sha256: expected,
      tagLiteralCounts: Object.fromEntries(publicTags.map(tag => [tag, occurrences(source, JSON.stringify(tag))])) };
  });
  for (const tag of [...bare, ...Object.values(map)].filter(tag => tag !== 'ui/Types.Exit'))
    assert.ok(generated.some(item => item.tagLiteralCounts[tag] > 0), `mapped tag absent from exact emission: ${tag}`);
  const transformations = Object.entries(ports).map(([name, spec]) => {
    const relative = prefix + name;
    return transformBrowserTags2035(relative, boundBytes(relative, spec.sha256)).metadata;
  });
  return { schema: 'rift-bend-2035-browser-tag-boundary/1', candidate: candidateCommit,
    transformer: { path: here, sha256: sha256(readSource(path.join(root, here))) },
    bindingHelper: { path: 'bend2/toolchain-patches/2035/selected-binding.mjs',
      sha256: sha256(readSource(path.join(root, 'bend2/toolchain-patches/2035/selected-binding.mjs'))) },
    map, assetResponse: { observatory: assetsResponse, sprite: piecesResponse }, unchangedBaseTags: bare,
    definitions: declared, generated, transformations,
    sourceOnlyMappings: ['ui/Types.Exit', assetsResponse, piecesResponse],
    limits: 'literal/site adaptation only; no graph rewriting, namespace erasure, accepted-port edits or browser acceptance' };
}

export function createBrowserTagBoundary2035({ onTransform = () => {} } = {}) {
  const binding = browserTagBoundaryBinding2035();
  const plugin = { name: 'rift-bend-2035-explicit-browser-tags', setup(build) {
    build.onLoad({ filter: /\.ts$/ }, args => {
      const relative = path.relative(root, args.path).split(path.sep).join('/');
      if (!relative.startsWith(prefix)) return;
      const name = relative.slice(prefix.length);
      if (!ports[name]) {
        const text = readSource(args.path).toString('utf8');
        assert.ok(!/\$\s*(?::|===|!==)\s*['"]|switch\s*\([^)]*\.\$/.test(text),
          `unreviewed candidate browser tag port: ${relative}`);
        return;
      }
      const result = transformBrowserTags2035(relative, readSource(args.path));
      assert.deepEqual(result.metadata, binding.transformations.find(item => item.path === relative),
        'candidate port transform changed after binding');
      onTransform(result.metadata);
      return { contents: result.contents, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  return { plugin, binding };
}

async function diagnostic() {
  assert.ok(typeof Bun !== 'undefined', 'use the local Bend wrapper');
  const binding = browserTagBoundaryBinding2035();
  const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' });
  for (const item of binding.transformations) {
    const result = transformBrowserTags2035(item.path, readSource(path.join(root, item.path)));
    transpiler.transformSync(result.contents);
  }
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw Error('boundary diagnostic denies network'); };
  const assetSource = transformBrowserTags2035(prefix + 'asset-port.ts',
    readSource(path.join(root, prefix + 'asset-port.ts')));
  const assetCode = transpiler.transformSync(assetSource.contents);
  const port = await import(`data:text/javascript;base64,${Buffer.from(assetCode).toString('base64')}`);
  const scene = (await import(pathToFileURL(path.join(root,
    '.artifacts/bend2/2035-preview/scene-IptWcU/scene.js')).href)).default;
  const values = list => {
    const result = [];
    while (list.$ === 'Con') { result.push(list.head); list = list.tail; }
    assert.equal(list.$, 'Nil');
    return result;
  };
  const list = values => values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
  const plateRequest = values(scene.asset_ids(0))[0];
  const plateResponses = await port.loadAssetRequests([{ ...plateRequest, max_bytes: 0 }]);
  assert.equal(plateResponses[0].$, assetsResponse);
  assert.equal(plateResponses[0].id, plateRequest.id, 'transport changed Bend asset ID identity');
  const plates = scene.load_plates(list(plateResponses));
  assert.equal(plates.$, map.ObservatoryPlates);
  const spriteRequests = values(scene.sprite_asset_ids()).map(request => ({ ...request, max_bytes: 0 }));
  const spriteResponses = await port.loadAssetRequests(spriteRequests, piecesResponse);
  assert.ok(spriteResponses.every(response => response.$ === piecesResponse));
  assert.equal(scene.load_sprite_pages(list(spriteResponses)).$, 'None');
  assert.equal(networkCalls, 0);
  assert.deepEqual(browserTagBoundaryBinding2035(), binding, 'boundary inputs changed during diagnostic');
  console.log(JSON.stringify({ ok: true, bindingSha256: sha256(JSON.stringify(binding)),
    transformations: binding.transformations, plateTag: plateResponses[0].$, spriteTag: spriteResponses[0].$,
    plateResult: plates.$, spriteResult: 'None', networkCalls,
    evidence: 'seven transformed TS ports transpile; actual scene missing-response branches preserve distinct asset tags; no browser/frame acceptance' }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.deepEqual(process.argv.slice(2), ['--diagnostic'], 'only --diagnostic is supported');
  await diagnostic();
}
