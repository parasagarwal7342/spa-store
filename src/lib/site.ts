// Business details used across the site. Change them here, in one place.
export const SITE = {
  name: 'SPA Enterprises',
  shortName: 'SPA Enterprise',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://spaenterprise.in').replace(/\/$/, ''),
  tagline: 'Authorised distributor of National Geographic & Shraddha',
  description:
    'Original National Geographic bags, backpacks and suitcases and handcrafted Shraddha brass jewellery from the authorised distributor in Delhi. Free delivery in Delhi NCR, Cash on Delivery and bulk / corporate orders.',
  phone: '+91 93122 77087',
  phoneHref: 'tel:+919312277087',
  whatsapp: '919312277087',
  email: 'spaenterprisesdelhi@gmail.com',
  addresses: [
    { label: 'Principal office', lines: ['53-B, Block-C, Gali No. 1, Karala', 'Near Yuva Shakti, Rama Vihar', 'Delhi – 110081'] },
    { label: 'Branch office', lines: ['Upper Ground, 104, Dream Hub Apartment-4', 'Najafgarh, Shyam Vihar Ph-II', 'New Delhi – 110043'] },
  ],
  gstin: '07AFAFS5850H1ZW',
  udyam: 'UDYAM-DL-06-0094890',
  builtBy: { name: 'Paravion Tech', url: 'https://portfolio-a6ccb.web.app/' },
} as const;

export const BRANDS = [
  {
    name: 'National Geographic',
    slug: 'national-geographic',
    logo: '/natgeo_final.png',
    blurb: 'Backpacks, sling bags and hard-shell luggage built for travel – many made from recycled ocean plastic.',
  },
  {
    name: 'Shraddha',
    slug: 'shraddha',
    logo: '/shraddha_logo.png',
    blurb: 'Handcrafted brass jewellery with a long-lasting gold finish and a 1-year coating warranty.',
  },
] as const;

export const whatsappLink = (text: string, number: string = SITE.whatsapp) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/** Only same-site paths like "/account"; rejects "//evil.com" and "/\\evil.com". */
export const safeNextPath = (next: unknown, fallback: string) =>
  typeof next === 'string' && /^\/(?![\/\\])/.test(next) && !/[\r\n]/.test(next) ? next : fallback;

/** JSON for <script type="application/ld+json">, safe against "</script>" in product text. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
