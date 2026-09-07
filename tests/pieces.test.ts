import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { createPiece, disposePiece, disposePieceAssets, type PieceFamily } from '../src/render/pieces';

type ComponentAudit = { closed: boolean; name: string; geometry: THREE.BufferGeometry };
type GroupAudit = { components: ComponentAudit[] };

function meshes(piece: THREE.Group): THREE.Mesh[] {
  return piece.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
}

function componentAudits(piece: THREE.Group): ComponentAudit[] {
  return (piece.userData.geometryAudit as GroupAudit).components;
}

function weldedBoundaryEdges(geometry: THREE.BufferGeometry): string[] {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const vertexAt = (vertex: number) => {
    const offset = vertex * position.itemSize;
    return [position.array[offset], position.array[offset + 1], position.array[offset + 2]].map(value => {
      const rounded = Math.round(Number(value) * 1_000_000) / 1_000_000;
      return Math.abs(rounded) < 0.0000005 ? '0.000000' : rounded.toFixed(6);
    }).join(',');
  };
  const edgeCounts = new Map<string, number>();
  const count = index?.count ?? position.count;
  const vertex = (offset: number) => index ? index.getX(offset) : offset;
  for (let offset = 0; offset < count; offset += 3) {
    const triangle = [vertexAt(vertex(offset)), vertexAt(vertex(offset + 1)), vertexAt(vertex(offset + 2))];
    if (new Set(triangle).size !== 3) continue;
    for (const [left, right] of [[0, 1], [1, 2], [2, 0]]) {
      const edge = [triangle[left], triangle[right]].sort().join(' / ');
      edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
    }
  }
  return [...edgeCounts.entries()].filter(([, uses]) => uses === 1).map(([edge]) => edge);
}

function assertFiniteAndOutward(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  expect(normal?.count).toBe(position.count);
  expect([...position.array, ...normal.array].every(Number.isFinite)).toBe(true);
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  const vertex = (offset: number) => index ? index.getX(offset) : offset;
  const point = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, offset: number) => new THREE.Vector3(attribute.getX(offset), attribute.getY(offset), attribute.getZ(offset));
  let minimumWinding = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < count; offset += 3) {
    const a = vertex(offset); const b = vertex(offset + 1); const c = vertex(offset + 2);
    const face = point(position, b).sub(point(position, a)).cross(point(position, c).sub(point(position, a)));
    if (face.lengthSq() < 1e-12) continue;
    const averagedNormal = point(normal, a).add(point(normal, b)).add(point(normal, c));
    minimumWinding = Math.min(minimumWinding, face.dot(averagedNormal));
  }
  expect(minimumWinding).toBeGreaterThan(0);
}

describe('piece sculptures', () => {
  it('uses bounded, front-sided closed components for every family, type, and army', () => {
    const kinds = [1, 2, 3, 4, 5, 6];
    const families: PieceFamily[] = ['classic', 'faceted'];
    for (const family of families) for (const code of kinds) {
      const armies = [createPiece(code, family, 'ceramic'), createPiece(-code, family, 'ceramic')];
      for (const piece of armies) {
        const bounds = new THREE.Box3().setFromObject(piece);
        expect(bounds.min.y).toBeGreaterThanOrEqual(-0.001);
        expect(Math.abs(bounds.min.y)).toBeLessThan(0.00001);
        expect(bounds.max.y).toBeLessThanOrEqual(1.35);
        expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z))).toBeLessThanOrEqual(0.345);
        expect(meshes(piece).length).toBe(1);
        const mesh = meshes(piece)[0];
        expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
        expect((mesh.material as THREE.MeshStandardMaterial).side).toBe(THREE.FrontSide);
        expect(mesh.userData.geometryAudit.componentCount).toBeGreaterThan(1);
      }
      const mesh = meshes(armies[0])[0];
      assertFiniteAndOutward(mesh.geometry);
      for (const audit of componentAudits(armies[0])) {
        expect(audit.closed).toBe(true);
        assertFiniteAndOutward(audit.geometry);
        const boundaries = weldedBoundaryEdges(audit.geometry);
        expect(boundaries, audit.name).toEqual([]);
      }
      armies.forEach(disposePiece);
    }
  });

  it('keeps the carved bishop mitre closed and makes the families structurally distinct', () => {
    for (const family of ['classic', 'faceted'] as PieceFamily[]) {
      const bishop = createPiece(3, family, 'metal');
      const mitre = componentAudits(bishop).find(component => component.name.includes('closed-carved-mitre'))!;
      expect(mitre.closed).toBe(true);
      expect(weldedBoundaryEdges(mitre.geometry)).toEqual([]);
      disposePiece(bishop);
    }
    const classic = createPiece(4, 'classic', 'wood');
    const faceted = createPiece(4, 'faceted', 'wood');
    expect(componentAudits(classic).some(component => component.name.includes('turned-sculptural-body'))).toBe(true);
    expect(componentAudits(faceted).some(component => component.name.includes('architectural-body'))).toBe(true);
    expect(componentAudits(classic).length).not.toBe(componentAudits(faceted).length);
    disposePiece(classic); disposePiece(faceted);
  });

  it('keeps ivory and dark-blue armies legible across all finish types', () => {
    for (const style of ['ceramic', 'metal', 'wood'] as const) {
      const ivory = meshes(createPiece(1, 'classic', style))[0].material as THREE.MeshStandardMaterial;
      const dark = meshes(createPiece(-1, 'classic', style))[0].material as THREE.MeshStandardMaterial;
      const luminance = (color: THREE.Color) => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
      expect(luminance(ivory.color)).toBeGreaterThan(luminance(dark.color) + 0.15);
    }
  });

  it('joins the pawn head and royal finials to their supporting components', () => {
    for (const family of ['classic', 'faceted'] as PieceFamily[]) for (const [code, upperName, supportName] of [
      [1, 'pawn-crowned-head', 'body'], [6, 'king-cross-upright', 'body'],
      [5, 'queen-continuous-orb-stem', 'queen-coronet-base'], [5, 'queen-crown-orb', 'queen-continuous-orb-stem'],
    ] as const) {
      const piece = createPiece(code, family, 'ceramic'), parts = componentAudits(piece);
      const bounds = (name: string) => { const geometry = parts.find(part => part.name.includes(name))!.geometry; geometry.computeBoundingBox(); return geometry.boundingBox!; };
      expect(bounds(upperName).intersectsBox(bounds(supportName)), `${family}: unsupported ${upperName}`).toBe(true);
      disposePiece(piece);
    }
  });
});

afterAll(() => disposePieceAssets());
