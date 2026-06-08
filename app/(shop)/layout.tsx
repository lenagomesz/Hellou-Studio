import { Navbar } from '@/components/shop/Navbar';
import { Footer } from '@/components/shop/Footer';
import { CartProvider } from '@/components/shop/CartContext';
import { WhatsAppButton } from '@/components/shop/WhatsAppButton';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <Navbar />
      <main className="min-h-screen flex-1 bg-[#F5F5F5]">{children}</main>
      <Footer />
      <WhatsAppButton />
    </CartProvider>
  );
}
