type CustomizationPart =
  | { type: 'text'; value: string }
  | { type: 'images'; label: string; urls: string[] };

function parseCustomization(value: string): CustomizationPart[] {
  return value.split('\n').reduce<CustomizationPart[]>((parts, line) => {
    const match = /^(.*?): Fotos: (.+)$/.exec(line.trim());
    if (!match) {
      if (line.trim()) parts.push({ type: 'text', value: line.trim() });
      return parts;
    }
    parts.push({
      type: 'images',
      label: match[1],
      urls: match[2].split(',').map((url) => url.trim()).filter(Boolean),
    });
    return parts;
  }, []);
}

export function CustomizationSummary({ value, title = 'Personalização:' }: { value: string; title?: string }) {
  const parts = parseCustomization(value);
  return (
    <div className="space-y-2">
      {parts.map((part, index) => part.type === 'text' ? (
        <p key={`${part.value}-${index}`} className="whitespace-pre-wrap break-words"><span className="font-semibold">{index === 0 ? title : ''}</span>{index === 0 ? ' ' : ''}{part.value}</p>
      ) : (
        <div key={`${part.label}-${index}`}>
          <p className="font-semibold">{part.label}:</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {part.urls.map((url, imageIndex) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-pink-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto enviada ${imageIndex + 1}`} className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
