import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="mb-3 text-3xl font-extrabold">This page doesn’t exist</h1>
      <p className="mb-8 text-ink-soft">The link may be old or mistyped.</p>
      <div className="flex gap-3"><Link href="/" className="btn-outline">Home</Link><Link href="/shop" className="btn-dark">Shop all products</Link></div>
    </div>
  );
}
