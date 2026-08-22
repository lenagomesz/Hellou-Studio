import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlogManagementSection } from '../components/BlogManagementSection';

export const metadata = {
  title: 'Gerenciamento de Blog',
  description: 'Gerencie rascunhos de posts do blog gerados por IA',
};

export default function BlogManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <Link
          href="/dashboard/ai-dashboard"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Painel de IA
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Gerenciamento de Blog
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Visualize, aprove ou rejeite posts gerados por IA antes da publicacao.
        </p>
      </div>

      {/* Blog Management Section */}
      <BlogManagementSection />
    </div>
  );
}
