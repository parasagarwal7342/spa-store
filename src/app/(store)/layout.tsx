import { Suspense } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WhatsAppFab } from '@/components/whatsapp-fab';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense><Header /></Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
