// What a jewellery post is "about". Rotating angles keeps the feed varied, and the
// season hint lets posts follow India's festival and wedding calendar without
// claiming exact dates (which change every year).

export const JEWELLERY_ANGLES = [
  { key: 'everyday', brief: 'Everyday elegance: a bracelet that goes from office to evening, light enough to wear all day.' },
  { key: 'gift', brief: 'Gifting: a thoughtful, ready-to-gift piece for a sister, mother, wife or friend, at a price that feels easy.' },
  { key: 'stack', brief: 'Styling: how to stack or pair it – with a watch, with ethnic wear, or as a single statement piece.' },
  { key: 'craft', brief: 'Craft: handcrafted brass with a long-lasting gold finish, backed by a 1-year coating warranty.' },
  { key: 'value', brief: 'Value: the real MRP versus today’s price, 100% original, Cash on Delivery – a low-risk first order.' },
  { key: 'care', brief: 'Care tip: keep it shining by keeping perfume and water off it and storing it dry – then show the product.' },
  { key: 'men', brief: 'For him: a kada he can wear every day – a simple, meaningful gift.' },
] as const;

/** Rough seasonal hook by month in India (IST). Posts may mention the season, never a specific date. */
export function seasonHint(now = new Date()): string {
  const month = new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCMonth() + 1;
  switch (month) {
    case 1: return 'wedding season and Makar Sankranti / Lohri gifting';
    case 2: return 'Valentine’s season and weddings';
    case 3: return 'Holi and Women’s Day gifting';
    case 4: case 5: return 'Akshaya Tritiya (an auspicious time to buy jewellery) and Mother’s Day';
    case 6: case 7: return 'everyday monsoon styling and Teej';
    case 8: return 'Raksha Bandhan gifting for sisters';
    case 9: case 10: return 'Navratri, Karwa Chauth and the run-up to Diwali';
    case 11: return 'Diwali, Bhai Dooj and the wedding season';
    default: return 'the wedding season and year-end gifting';
  }
}

export const pickAngle = (seed: number, isKada: boolean) => {
  const pool = JEWELLERY_ANGLES.filter((a) => a.key !== 'men' || isKada);
  return pool[Math.abs(seed) % pool.length];
};
