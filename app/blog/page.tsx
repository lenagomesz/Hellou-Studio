import { BlogGrid } from './components/BlogGrid';
import { Sparkles } from 'lucide-react';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-900">Blog de Ideias</span>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Descubra Ideias de Decoração e Design
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Dicas de organização, tendências, e curiosidades para transformar seus espaços
          </p>
        </div>

        <BlogGrid />
      </div>
    </div>
  );
}
