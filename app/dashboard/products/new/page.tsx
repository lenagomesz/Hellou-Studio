import { ProductEditor } from '@/components/admin/ProductEditor/ProductEditor';
import { ProductTypeTabs } from '@/components/admin/ProductTypeTabs';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <ProductTypeTabs active="physical" />
      <ProductEditor mode="create" />
    </div>
  );
}
