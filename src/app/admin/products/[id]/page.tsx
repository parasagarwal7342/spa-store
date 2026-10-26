import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq, sql } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { db, products, type Product } from '@/db';
import { saveProduct } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'Edit product' };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: Product | undefined;
  if (id !== 'new') {
    if (!/^\d+$/.test(id)) notFound();
    [p] = await db.select().from(products).where(eq(products.id, Number(id)));
    if (!p) notFound();
  }
  const cats = await db.selectDistinct({ c: products.category }).from(products).orderBy(asc(products.category));
  const brands = await db.selectDistinct({ b: products.brand }).from(products).orderBy(sql`1`);

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ChevronLeft size={16} /> Products</Link>
      <h1 className="mb-6 text-2xl font-extrabold">{p ? 'Edit product' : 'Add product'}</h1>
      <ActionForm action={saveProduct} submit="Save product" className="card grid max-w-4xl gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {p && <input type="hidden" name="id" value={p.id} />}
        <label><span className="label">SKU / product code</span><input name="sku" required defaultValue={p?.sku} className="input" /></label>
        <label><span className="label">Brand</span><input name="brand" required list="brands" defaultValue={p?.brand ?? 'National Geographic'} className="input" /></label>
        <datalist id="brands">{brands.map((b) => <option key={b.b} value={b.b} />)}</datalist>
        <label className="sm:col-span-2"><span className="label">Product name</span><input name="name" required defaultValue={p?.name} className="input" /></label>
        <label><span className="label">Category</span><input name="category" required list="cats" defaultValue={p?.category} className="input" /></label>
        <datalist id="cats">{cats.map((c) => <option key={c.c} value={c.c} />)}</datalist>
        <label><span className="label">Stock on hand (empty = not tracked)</span><input name="stock" type="number" min={0} defaultValue={p?.stock ?? ''} className="input" /></label>
        <label><span className="label">Selling price ₹ (incl. GST)</span><input name="price" type="number" min={1} required defaultValue={p?.price} className="input" /></label>
        <label><span className="label">MRP ₹ (shown crossed out)</span><input name="mrp" type="number" min={1} defaultValue={p?.mrp ?? ''} className="input" /></label>
        <label><span className="label">Wholesale price ₹ (internal)</span><input name="wholesalePrice" type="number" min={1} defaultValue={p?.wholesalePrice ?? ''} className="input" /></label>
        <label><span className="label">Wholesale minimum quantity</span><input name="wholesaleMinQty" type="number" min={1} defaultValue={p?.wholesaleMinQty ?? 10} className="input" /></label>
        <label className="sm:col-span-2"><span className="label">Photo links, one per line (first is the main photo)</span><textarea name="images" rows={3} defaultValue={p?.images.join('\n')} className="input" placeholder="https://…" /></label>
        <label className="sm:col-span-2"><span className="label">…or upload photos</span><input name="upload" type="file" accept="image/*" multiple className="input" /></label>
        <label><span className="label">Highlights, one per line</span><textarea name="highlights" rows={5} defaultValue={p?.highlights.join('\n')} className="input" /></label>
        <label><span className="label">Description</span><textarea name="description" rows={5} defaultValue={p?.description} className="input" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-4 w-4 accent-ink" /> Show on website</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="h-4 w-4 accent-ink" /> Feature on homepage</label>
      </ActionForm>
    </>
  );
}
