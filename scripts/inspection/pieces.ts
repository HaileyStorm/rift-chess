import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPiece, disposePieceAssets, type PieceFamily, type MaterialStyle } from '../../src/render/pieces';

type Settings = { family: PieceFamily; material: MaterialStyle; view: 'front' | 'side' | 'three-quarter' | 'top'; shadows: boolean; diagnostic: 'material' | 'neutral' | 'normal' | 'depth' | 'wireframe'; zoom: number };
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); renderer.setSize(1800, 680); renderer.setScissorTest(true);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
document.body.append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x263541);
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(), environment = pmrem.fromScene(room, .045); scene.environment = environment.texture; scene.environmentIntensity = .45; room.dispose(); pmrem.dispose();
const key = new THREE.DirectionalLight(0xffecd4, 2); key.position.set(-3, 6, 4); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -1.3; key.shadow.camera.right = 1.3; key.shadow.camera.top = 1.3; key.shadow.camera.bottom = -1.3; key.shadow.camera.near = .1; key.shadow.camera.far = 15; key.shadow.bias = .00015; key.shadow.normalBias = .03;
scene.add(key, new THREE.HemisphereLight(0xc3e4f5, 0x1a1a20, .5));
const rim = new THREE.DirectionalLight(0xbdd9ff, 1.1); rim.position.set(4, 3, -3); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x42525e, roughness: .65 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.003; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.OrthographicCamera(-.9, .9, 1.02, -1.02, .1, 15);
const diagnostics = { neutral: new THREE.MeshStandardMaterial({ color: 0xc2c2c2, roughness: .65 }), normal: new THREE.MeshNormalMaterial(), depth: new THREE.MeshDepthMaterial(), wireframe: new THREE.MeshBasicMaterial({ color: 0xaaf4e3, wireframe: true }) };
const kinds = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];
let state: Settings = { family: 'classic', material: 'ceramic', view: 'three-quarter', shadows: true, diagnostic: 'material', zoom: 1 };

function render(settings: Partial<Settings> = {}) {
  state = { ...state, ...settings }; renderer.shadowMap.enabled = state.shadows; key.castShadow = state.shadows; floor.receiveShadow = state.shadows; (floor.material as THREE.Material).needsUpdate = true; floor.visible = state.diagnostic === 'material' || state.diagnostic === 'neutral';
  camera.zoom = state.zoom; camera.updateProjectionMatrix();
  const positions = { front: [0, .73, 4], side: [4, .73, 0], 'three-quarter': [2.8, 2.1, 3.6], top: [0, 4.8, .001] } as const;
  camera.position.set(...positions[state.view]); camera.lookAt(0, .66, 0); camera.updateMatrixWorld();
  document.querySelector('#caption')!.textContent = `${state.family} / ${state.material} / ${state.view} / ${state.diagnostic} / shadows ${state.shadows ? 'on' : 'off'} / zoom ${state.zoom}`;
  document.querySelector('#labels')!.replaceChildren(...Array.from({ length: 12 }, (_, i) => { const span = document.createElement('span'); span.textContent = `${i < 6 ? 'White' : 'Black'} ${kinds[i % 6]}`; return span; }));
  for (let i = 0; i < 12; i++) {
    const code = (i % 6 + 1) * (i < 6 ? 1 : -1); const piece = createPiece(code, state.family, state.material);
    if (state.diagnostic !== 'material') piece.traverse(object => { if (object instanceof THREE.Mesh) object.material = diagnostics[state.diagnostic as keyof typeof diagnostics]; });
    piece.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = state.shadows; object.receiveShadow = state.shadows; (object.material as THREE.Material).needsUpdate = true; } });
    scene.add(piece); renderer.setViewport(i % 6 * 300, i < 6 ? 340 : 0, 300, 340); renderer.setScissor(i % 6 * 300, i < 6 ? 340 : 0, 300, 340); renderer.render(scene, camera); scene.remove(piece);
  }
  return { ...state, renderer: renderer.getContext().getParameter(renderer.getContext().RENDERER), version: THREE.REVISION };
}
(window as Window & { inspectPieces?: unknown }).inspectPieces = { render };
render();
window.addEventListener('pagehide', () => { disposePieceAssets(); environment.dispose(); Object.values(diagnostics).forEach(m => m.dispose()); floor.geometry.dispose(); (floor.material as THREE.Material).dispose(); key.shadow.map?.dispose(); renderer.dispose(); });
