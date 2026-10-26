import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/components/cart-context';
import { SITE, jsonLd } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'SPA Enterprise – National Geographic Bags & Shraddha Jewellery, Delhi', template: '%s | SPA Enterprise' },
  description: SITE.description,
  icons: { icon: '/logo.png' },
  openGraph: { type: 'website', siteName: SITE.shortName, locale: 'en_IN', images: ['/natgeo_branding.png'] },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#14161b' };

const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/logo.png`,
  telephone: SITE.phone,
  email: SITE.email,
  address: { '@type': 'PostalAddress', streetAddress: '53-B, Block-C, Gali No. 1, Karala, Rama Vihar', addressLocality: 'Delhi', postalCode: '110081', addressCountry: 'IN' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(storeJsonLd) }} />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
