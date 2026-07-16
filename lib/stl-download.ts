export interface DownloadableProduct {
  id: string;
  name: string;
  file_path: string | null;
  type: string;
}

export type ProductRelation = DownloadableProduct | DownloadableProduct[] | null;

export function normalizeProductRelation(relation: ProductRelation) {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function getStorageCandidates(filePath: string) {
  const candidates: Array<{ bucket: string; path: string }> = [];

  const addCandidate = (bucket: string, path: string) => {
    const normalizedPath = decodeURIComponent(path).replace(/^\/+/, '');
    if (!normalizedPath) return;
    if (!candidates.some((candidate) => candidate.bucket === bucket && candidate.path === normalizedPath)) {
      candidates.push({ bucket, path: normalizedPath });
    }
  };

  try {
    const url = new URL(filePath);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (match) addCandidate(match[1], match[2]);
  } catch {
    // Relative Storage paths are expected for products created by the admin.
  }

  const relativePath = filePath.split('?')[0].replace(/^\/+/, '');
  const fileName = relativePath.split('/').pop();

  // Current files live in stl-uploads; older admin uploads used products/stl-files/....
  addCandidate('stl-uploads', relativePath);
  addCandidate('products', relativePath);
  if (fileName) {
    addCandidate('stl-uploads', fileName);
    addCandidate('products', fileName);
  }

  return candidates;
}
