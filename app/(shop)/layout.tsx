import { Navbar } from '@/components/shop/Navbar';
import { Footer } from '@/components/shop/Footer';
import { CartProvider } from '@/components/shop/CartContext';
import { ScrollToTop } from '@/components/ScrollToTop';
import { getStoreSettings, storeThemeStyle } from '@/lib/store-settings';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  return (
    <div style={storeThemeStyle(settings)} className="contents">
    <CartProvider>
      <div className="flex min-h-screen flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <ScrollToTop />
      <Navbar settings={settings} />
      <main className="min-h-screen flex-1 bg-[#F5F5F5] dark:bg-gray-950">{children}</main>
      <Footer settings={settings} />
      </div>
    </CartProvider>
    </div>
  );
}
