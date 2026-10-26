export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

/** Product URLs look like /p/black-sling-bag-n20902-06 – readable and unique via the SKU. */
export const productSlug = (name: string, sku: string) => {
  const cleaned = name.replace(/^national geographic\s+/i, '').replace(/\bnat geo\b/gi, '');
  return `${slugify(cleaned).split('-').slice(0, 8).join('-')}-${slugify(sku)}`;
};
