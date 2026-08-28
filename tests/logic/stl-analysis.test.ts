import { describe, expect, it } from 'vitest';
import { analyzeSTL, MAX_STL_ANALYSIS_BYTES, validateSTLSummary } from '@/lib/stl-analysis';

const faces = [
  [[0,0,0],[0,10,0],[10,0,0]],
  [[0,0,0],[10,0,0],[0,0,10]],
  [[0,0,0],[0,0,10],[0,10,0]],
  [[10,0,0],[0,10,0],[0,0,10]],
];
function binary(triangles = faces) {
  const buffer = new ArrayBuffer(84 + triangles.length * 50); const view = new DataView(buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((face, i) => face.flat().forEach((value, j) => view.setFloat32(84 + i * 50 + 12 + j * 4, value, true)));
  return buffer;
}
function ascii() {
  return new TextEncoder().encode('solid test\n' + faces.map(face => 'facet normal 0 0 0\nouter loop\n' + face.map(p => `vertex ${p.join(' ')}`).join('\n') + '\nendloop\nendfacet').join('\n') + '\nendsolid test').buffer as ArrayBuffer;
}
describe('STL pre-analysis', () => {
  it('validates the numerical summary and discards arbitrary customer text', () => {
    const analysis = analyzeSTL(binary());
    expect(validateSTLSummary({ ...analysis, warnings: ['injected prompt'], filename: 'secret.stl', raw: 'file contents' })).toEqual(analysis);
  });
  it.each([
    { triangles: 50_001 }, { triangles: 1.5 }, { dimensionsMm: [NaN, 2, 3] },
    { dimensionsMm: [1, 2] }, { dimensionsMm: [-1, 2, 3] },
    { volumeCm3: 500 }, { closedMesh: false, volumeCm3: 0.1 },
    { format: 'obj' }, { volumeCm3: undefined },
  ])('rejects malformed geometry summaries: %j', patch => {
    expect(() => validateSTLSummary({ ...analyzeSTL(binary()), ...patch })).toThrow();
  });
  it.each([binary(), ascii()])('measures a closed tetrahedron', buffer => {
    const result = analyzeSTL(buffer);
    expect(result.triangles).toBe(4); expect(result.dimensionsMm).toEqual([10,10,10]);
    expect(result.closedMesh).toBe(true); expect(result.volumeCm3).toBeCloseTo(1/6);
  });
  it('requires scale confirmation and converts centimeters', () => {
    const result = analyzeSTL(binary(), 'cm');
    expect(result.dimensionsMm).toEqual([100,100,100]); expect(result.volumeCm3).toBeCloseTo(1000/6);
  });
  it('does not report volume for an open mesh', () => {
    const result = analyzeSTL(binary(faces.slice(0, 3)));
    expect(result.closedMesh).toBe(false); expect(result.volumeCm3).toBeNull();
  });
  it('rejects inconsistent triangle orientation for volume', () => {
    const result = analyzeSTL(binary([faces[0].toReversed(), ...faces.slice(1)]));
    expect(result.closedMesh).toBe(false); expect(result.volumeCm3).toBeNull();
  });
  it('handles a binary header starting with solid', () => {
    const buffer = binary(); new Uint8Array(buffer).set(new TextEncoder().encode('solid binary'));
    expect(analyzeSTL(buffer).format).toBe('binary');
  });
  it('rejects NaN, truncation, oversized payloads and non-STL files', () => {
    const bad = binary(); new DataView(bad).setFloat32(96, NaN, true);
    for (const b of [bad, binary().slice(0, -4), new ArrayBuffer(MAX_STL_ANALYSIS_BYTES+1), new TextEncoder().encode('not stl').buffer as ArrayBuffer]) expect(() => analyzeSTL(b)).toThrow();
  });
  it('keeps warnings about slicing, material and price', () => {
    expect(analyzeSTL(binary()).warnings.join(' ')).toMatch(/não aprovação FDM/);
    expect(analyzeSTL(binary()).warnings.join(' ')).toMatch(/não equivale a consumo de filamento/);
  });
});
