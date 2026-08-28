export const MAX_STL_ANALYSIS_BYTES = 3 * 1024 * 1024;
const MAX_TRIANGLES = 50_000;
type Point = [number, number, number];
export type STLAnalysis = {
  format: 'binary' | 'ascii'; triangles: number; dimensionsMm: Point;
  closedMesh: boolean; volumeCm3: number | null; warnings: string[];
};

export function analyzeSTL(buffer: ArrayBuffer, unit: 'mm' | 'cm' | 'in' = 'mm'): STLAnalysis {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_STL_ANALYSIS_BYTES) throw new Error('Para análise instantânea, use um STL de até 3 MB. Arquivos maiores podem seguir para análise manual.');
  if (!['mm', 'cm', 'in'].includes(unit)) throw new Error('Unidade inválida');
  const scale = unit === 'cm' ? 10 : unit === 'in' ? 25.4 : 1;
  const view = new DataView(buffer);
  const declared = buffer.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const binary = declared > 0 && 84 + declared * 50 === buffer.byteLength;
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  const edges = new Map<string, { count: number; direction: number }>();
  let triangles = 0, signedVolume = 0, degenerate = 0;
  let origin: Point | null = null;
  function addTriangle(points: Point[]) {
    if (++triangles > MAX_TRIANGLES) throw new Error('Malha muito complexa para análise instantânea (máximo 50 mil triângulos).');
    for (const point of points) for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(point[i]) || Math.abs(point[i]) > 1_000_000) throw new Error('STL contém coordenadas inválidas');
      point[i] *= scale;
      min[i] = Math.min(min[i], point[i]); max[i] = Math.max(max[i], point[i]);
    }
    origin ??= points[0];
    const [a, b, c] = points.map(p => p.map((v, i) => v - origin![i]) as Point);
    signedVolume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i]);
    const cross = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
    if (cross.every(v => Math.abs(v) < 1e-12)) degenerate++;
    const keys = points.map(p => p.join(','));
    for (let i = 0; i < 3; i++) {
      const start = keys[i], end = keys[(i + 1) % 3];
      const key = start < end ? `${start}|${end}` : `${end}|${start}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++; edge.direction += start < end ? 1 : -1; edges.set(key, edge);
    }
  }
  if (binary) {
    if (declared > MAX_TRIANGLES) throw new Error('Malha muito complexa para análise instantânea (máximo 50 mil triângulos).');
    for (let t = 0; t < declared; t++) {
      const offset = 84 + t * 50 + 12;
      addTriangle([0, 1, 2].map(v => [0, 1, 2].map(axis => view.getFloat32(offset + v * 12 + axis * 4, true)) as Point));
    }
  } else {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).trim();
    if (!/^solid(?:\s|$)/i.test(text) || !/endsolid[^\r\n]*$/i.test(text)) throw new Error('STL inválido ou incompleto');
    const facets = text.matchAll(/facet\s+normal\s+[^\r\n]+\s+outer\s+loop\s+([\s\S]*?)endloop\s+endfacet/gi);
    let matchedFacets = 0;
    for (const facet of facets) {
      const vertices = [...facet[1].matchAll(/vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi)];
      if (vertices.length !== 3 || facet[1].replace(/vertex\s+[^\s]+\s+[^\s]+\s+[^\s]+/gi, '').trim()) throw new Error('Triângulo STL inválido');
      addTriangle(vertices.map(v => [Number(v[1]), Number(v[2]), Number(v[3])]));
      matchedFacets++;
    }
    if (!matchedFacets || matchedFacets !== (text.match(/\bfacet\b/gi) ?? []).length) throw new Error('STL incompleto ou inválido');
  }
  const dimensionsMm = max.map((v, i) => v - min[i]) as Point;
  if (!triangles || dimensionsMm.every(v => v === 0)) throw new Error('STL sem geometria utilizável');
  const closedMesh = degenerate === 0 && [...edges.values()].every(e => e.count === 2 && e.direction === 0);
  const volume = Math.abs(signedVolume) / 1000;
  const boxVolume = dimensionsMm.reduce((a, b) => a * b, 1) / 1000;
  const volumeCm3 = closedMesh && volume > 0 && volume <= boxVolume * 1.000001 ? volume : null;
  const warnings = ['STL não informa unidade: confirme a escala escolhida.', 'Pré-análise geométrica, não aprovação FDM. Paredes finas, encaixes, balanços, auto-interseções e resistência exigem revisão no fatiador.', 'Volume geométrico não equivale a consumo de filamento. Preço e prazo dependem de material, preenchimento, suportes e tempo de impressão.'];
  if (!closedMesh) warnings.unshift('A malha contém bordas abertas, orientação inconsistente ou faces degeneradas. Volume não calculado; revise/repare no fatiador.');
  return { format: binary ? 'binary' : 'ascii', triangles, dimensionsMm, closedMesh, volumeCm3, warnings };
}
