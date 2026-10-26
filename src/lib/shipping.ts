// Shared by the server (authoritative) and the cart page (preview only).
export const SHIPPING_FEE = Number(process.env.NEXT_PUBLIC_SHIPPING_FEE ?? process.env.SHIPPING_FEE ?? 500);
export const FREE_SHIPPING_ABOVE = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_ABOVE ?? process.env.FREE_SHIPPING_ABOVE ?? 4999);

/** Delhi NCR pin codes: Delhi 110, Faridabad 121, Gurugram 122, Noida/Ghaziabad 201. */
export const isDelhiNcr = (pincode: string) => /^(110|121|122|201)\d{3}$/.test(pincode.trim());

export function shippingFor(amountAfterDiscount: number, pincode: string | null) {
  if (pincode && isDelhiNcr(pincode)) return 0;
  return amountAfterDiscount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
}

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;
