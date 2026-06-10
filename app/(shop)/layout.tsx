import { Navbar } from '@/components/shop/Navbar';
import { Footer } from '@/components/shop/Footer';
import { CartProvider } from '@/components/shop/CartContext';
import { WhatsAppButton } from '@/components/shop/WhatsAppButton';
import { ScrollToTop } from '@/components/ScrollToTop';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <ScrollToTop />
      <Navbar />
      <main className="min-h-screen flex-1 bg-[#F5F5F5] dark:bg-gray-950">{children}</main>
      <Footer />
      <WhatsAppButton />
    </CartProvider>
  );
}
