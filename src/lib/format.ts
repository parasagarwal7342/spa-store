export const inr = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : `₹${Math.round(n).toLocaleString('en-IN')}`;

export const percentOff = (price: number, mrp: number | null | undefined) =>
  mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bRpet\b/g, 'RPET').replace(/\bRfid\b/g, 'RFID');

/** Product names arrive in shouty marketplace style; show them calmly. */
export const displayName = (name: string) => titleCase(name.replace(/\s+/g, ' ').trim());

export const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

/** 10-digit Indian mobile → wa.me format. */
export const toWhatsAppNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d.replace(/^0+/, '');
};
