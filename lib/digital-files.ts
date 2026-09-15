export const DIGITAL_FILE_EXTENSIONS = ['stl', '3mf'] as const;

export type DigitalFileExtension = (typeof DIGITAL_FILE_EXTENSIONS)[number];

export function getDigitalFileExtension(filePath: string): DigitalFileExtension | null {
  const pathWithoutQuery = filePath.split(/[?#]/, 1)[0];
  const extension = pathWithoutQuery.split('.').pop()?.toLowerCase();
  return DIGITAL_FILE_EXTENSIONS.includes(extension as DigitalFileExtension)
    ? (extension as DigitalFileExtension)
    : null;
}

export function isSupportedDigitalFile(fileName: string) {
  return getDigitalFileExtension(fileName) !== null;
}

export function getDigitalDownloadFileName(productName: string, filePath: string) {
  const extension = getDigitalFileExtension(filePath) ?? 'stl';
  const cleanName = productName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  const nameWithoutDigitalExtension = cleanName.replace(/\.(?:stl|3mf)$/i, '');
  return `${nameWithoutDigitalExtension || 'arquivo_digital'}.${extension}`;
}

export function getDigitalFileContentType(filePath: string) {
  return getDigitalFileExtension(filePath) === '3mf' ? 'model/3mf' : 'application/octet-stream';
}
