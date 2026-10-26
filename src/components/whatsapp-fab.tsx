import { whatsappLink } from '@/lib/site';
import { WhatsAppIcon } from './whatsapp-icon';

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink('Hi SPA Enterprise, I have a question about your products.')}
      target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1faa53] text-white shadow-lg shadow-black/20 transition hover:scale-105"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}
