import { Navbar } from '@/components/shop/Navbar';
import { Footer } from '@/components/shop/Footer';
import { CartProvider } from '@/components/shop/CartContext';
import { WhatsAppButton } from '@/components/shop/WhatsAppButton';
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
      <ScrollToTop />
      <Navbar settings={settings} />
      <main className="min-h-screen flex-1 bg-[#F5F5F5] dark:bg-gray-950">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton settings={settings} />
    </CartProvider>
    </div>
  );
}
