import type { Metadata } from 'next';
import { PackagingTemplates } from '@/components/admin/PackagingTemplates';

export const metadata: Metadata = {
  title: 'Embalagens A4',
  robots: { index: false, follow: false },
};

export default function PackagingPage() {
  return <PackagingTemplates />;
}

