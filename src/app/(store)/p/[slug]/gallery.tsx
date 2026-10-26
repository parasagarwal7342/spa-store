'use client';

import Image from 'next/image';
import { useState } from 'react';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : ['/logo.png'];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-line bg-sand">
        <Image src={list[active]} alt={alt} fill priority sizes="(min-width:1024px) 600px, 100vw" className="object-contain p-8 mix-blend-multiply" />
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {list.map((src, i) => (
            <button key={src} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-sand ${i === active ? 'border-ink ring-2 ring-brand-400' : 'border-line'}`}>
              <Image src={src} alt="" fill sizes="80px" className="object-contain p-1.5 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
