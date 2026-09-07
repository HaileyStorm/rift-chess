import * as THREE from 'three';

/** One bundled image is shared by the world's stone and tile surface shaders. */
export function loadStoneTexture(): { texture: THREE.Texture; ready: Promise<void> } {
  let resolve!: () => void; let reject!: (reason: unknown) => void;
  const ready = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/marble-albedo.png`, () => resolve(), () => reject(new Error('The bundled stone texture could not be loaded.')));
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return { texture, ready };
}

/** Local coordinates keep mineral detail attached to moving platforms. */
export function applyStoneDetail(material: THREE.MeshStandardMaterial, texture: THREE.Texture, scale: number, strength: number): void {
  material.onBeforeCompile = shader => {
    shader.uniforms.uStoneTexture = { value: texture };
    shader.vertexShader = 'varying vec3 vStonePosition; varying vec3 vStoneNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStonePosition = position; vStoneNormal = normal;');
    shader.fragmentShader = 'uniform sampler2D uStoneTexture; varying vec3 vStonePosition; varying vec3 vStoneNormal;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 weights = pow(abs(normalize(vStoneNormal)), vec3(6.0)); weights /= max(dot(weights, vec3(1.0)), .0001);
      vec3 stone = texture2D(uStoneTexture, vStonePosition.yz * ${scale.toFixed(4)}).rgb * weights.x
        + texture2D(uStoneTexture, vStonePosition.xz * ${scale.toFixed(4)}).rgb * weights.y
        + texture2D(uStoneTexture, vStonePosition.xy * ${scale.toFixed(4)}).rgb * weights.z;
      float mineral = clamp(.50 + 4.2 * sqrt(max(dot(stone, vec3(.2126, .7152, .0722)), .0001)), .55, 1.45);
      diffuseColor.rgb *= mix(1.0, mineral, ${strength.toFixed(4)});
    `);
  };
  material.customProgramCacheKey = () => `rift-stone-${scale}-${strength}`;
}
