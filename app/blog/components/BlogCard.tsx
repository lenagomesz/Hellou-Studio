import Link from 'next/link';
import Image from 'next/image';

interface BlogCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url?: string;
  created_at: string;
}

export function BlogCard({ id: _id, title, slug, excerpt, image_url, created_at }: BlogCardProps) {
  const date = new Date(created_at).toLocaleDateString('pt-BR');

  return (
    <Link href={`/blog/${slug}`}>
      <div className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        {image_url && (
          <div className="relative h-48 w-full overflow-hidden bg-gray-200">
            <Image
              src={image_url}
              alt={title}
              fill
              className="object-cover transition group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{excerpt}</p>
          <p className="mt-3 text-xs text-gray-400">{date}</p>
        </div>
      </div>
    </Link>
  );
}
