const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

type Geometry = { positions: Float32Array; normals: Float32Array; indices: Uint32Array; min: [number, number, number]; max: [number, number, number] };

function geometryFromVertices(vertices: number[]) {
  if (vertices.length === 0 || vertices.length % 9 !== 0) throw new Error('O STL não contém triângulos válidos');
  const positions = new Float32Array(vertices);
  const normals = new Float32Array(positions.length);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
    const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const length = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) || 1;
    const nx = (uy * vz - uz * vy) / length, ny = (uz * vx - ux * vz) / length, nz = (ux * vy - uy * vx) / length;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = i + vertex * 3;
      normals[offset] = nx; normals[offset + 1] = ny; normals[offset + 2] = nz;
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], positions[offset + axis]);
        max[axis] = Math.max(max[axis], positions[offset + axis]);
      }
    }
  }
  return { positions, normals, indices: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index), min, max } satisfies Geometry;
}

function parseBinarySTL(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 84) throw new Error('Arquivo STL muito curto');
  const triangles = view.getUint32(80, true);
  if (84 + triangles * 50 !== bytes.byteLength) return null;
  const vertices: number[] = [];
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const offset = 84 + triangle * 50 + 12;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      for (let axis = 0; axis < 3; axis += 1) vertices.push(view.getFloat32(offset + vertex * 12 + axis * 4, true));
    }
  }
  return geometryFromVertices(vertices);
}

function parseAsciiSTL(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes);
  const vertices: number[] = [];
  const expression = /vertex\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  for (const match of text.matchAll(expression)) vertices.push(Number(match[1]), Number(match[2]), Number(match[3]));
  return geometryFromVertices(vertices);
}

function paddedLength(length: number) { return Math.ceil(length / 4) * 4; }

/** Converts an STL mesh to a compact, single-material GLB for the storefront viewer. */
export function stlToGlb(source: ArrayBuffer) {
  const bytes = new Uint8Array(source);
  const geometry = parseBinarySTL(bytes) ?? parseAsciiSTL(bytes);
  const positionLength = geometry.positions.byteLength;
  const normalLength = geometry.normals.byteLength;
  const indexOffset = positionLength + normalLength;
  const binary = new Uint8Array(paddedLength(indexOffset + geometry.indices.byteLength));
  binary.set(new Uint8Array(geometry.positions.buffer), 0);
  binary.set(new Uint8Array(geometry.normals.buffer), positionLength);
  binary.set(new Uint8Array(geometry.indices.buffer), indexOffset);
  const document = {
    asset: { version: '2.0', generator: 'Hellou Studio STL converter' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }] }],
    materials: [{ name: 'Cor do produto', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionLength, target: 34962 },
      { buffer: 0, byteOffset: positionLength, byteLength: normalLength, target: 34962 },
      { buffer: 0, byteOffset: indexOffset, byteLength: geometry.indices.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: geometry.positions.length / 3, type: 'VEC3', min: geometry.min, max: geometry.max },
      { bufferView: 1, componentType: 5126, count: geometry.normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: geometry.indices.length, type: 'SCALAR' },
    ],
  };
  const json = new TextEncoder().encode(JSON.stringify(document));
  const jsonLength = paddedLength(json.byteLength);
  const result = new ArrayBuffer(12 + 8 + jsonLength + 8 + binary.byteLength);
  const view = new DataView(result);
  view.setUint32(0, GLB_MAGIC, true); view.setUint32(4, 2, true); view.setUint32(8, result.byteLength, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, JSON_CHUNK, true);
  new Uint8Array(result, 20, json.byteLength).set(json);
  new Uint8Array(result, 20 + json.byteLength, jsonLength - json.byteLength).fill(0x20);
  const binaryOffset = 20 + jsonLength;
  view.setUint32(binaryOffset, binary.byteLength, true); view.setUint32(binaryOffset + 4, BIN_CHUNK, true);
  new Uint8Array(result, binaryOffset + 8).set(binary);
  return result;
}
