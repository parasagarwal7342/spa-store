import {
  boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'staff', 'owner']);
export const orderStatusEnum = pgEnum('order_status', ['pending_payment', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['online', 'cod']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const leadTypeEnum = pgEnum('lead_type', ['bulk', 'dealer', 'contact', 'warranty']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'quoted', 'won', 'lost']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  /** Always stored lower-case. */
  email: varchar('email', { length: 120 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('customer'),
  ...timestamps,
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 40 }).notNull().unique(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  brand: varchar('brand', { length: 60 }).notNull(),
  category: varchar('category', { length: 60 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull().default(''),
  highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  /** Selling price in whole rupees, GST included. */
  price: integer('price').notNull(),
  mrp: integer('mrp'),
  /** null = not tracked, always available. */
  stock: integer('stock'),
  wholesalePrice: integer('wholesale_price'),
  wholesaleMinQty: integer('wholesale_min_qty').notNull().default(10),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  ...timestamps,
}, (t) => [index('products_brand_idx').on(t.brand), index('products_category_idx').on(t.category)]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  number: varchar('number', { length: 24 }).notNull().unique(),
  /** Random secret in the confirmation link, so guests can view their order. */
  accessKey: varchar('access_key', { length: 32 }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 80 }).notNull(),
  customerEmail: varchar('customer_email', { length: 120 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  addressLine: text('address_line').notNull(),
  city: varchar('city', { length: 80 }).notNull(),
  state: varchar('state', { length: 60 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  couponCode: varchar('coupon_code', { length: 24 }),
  shippingFee: integer('shipping_fee').notNull(),
  total: integer('total').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 64 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 64 }),
  status: orderStatusEnum('status').notNull(),
  courier: varchar('courier', { length: 60 }),
  trackingNumber: varchar('tracking_number', { length: 80 }),
  customerNote: text('customer_note'),
  internalNote: text('internal_note'),
  ...timestamps,
}, (t) => [
  index('orders_user_idx').on(t.userId),
  index('orders_created_idx').on(t.createdAt),
  index('orders_status_idx').on(t.status),
  index('orders_razorpay_idx').on(t.razorpayOrderId),
]);

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  // Snapshot so the order stays correct even if the product changes later.
  sku: varchar('sku', { length: 40 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  brand: varchar('brand', { length: 60 }).notNull(),
  image: text('image'),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
}, (t) => [index('order_items_order_idx').on(t.orderId)]);

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  type: leadTypeEnum('type').notNull(),
  name: varchar('name', { length: 80 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 120 }),
  company: varchar('company', { length: 120 }),
  city: varchar('city', { length: 80 }),
  productSku: varchar('product_sku', { length: 40 }),
  quantity: integer('quantity'),
  orderNumber: varchar('order_number', { length: 24 }),
  message: text('message').notNull().default(''),
  status: leadStatusEnum('status').notNull().default('new'),
  notes: text('notes'),
  ...timestamps,
}, (t) => [index('leads_status_idx').on(t.status)]);

export const coupons = pgTable('coupons', {
  code: varchar('code', { length: 24 }).primaryKey(),
  /** Short public name, e.g. "Diwali Sale". Used in social posts. */
  title: varchar('title', { length: 80 }),
  /** Announce this offer on social media automatically. */
  promote: boolean('promote').notNull().default(true),
  announcedAt: timestamp('announced_at', { withTimezone: true }),
  percentOff: integer('percent_off').notNull(),
  minOrder: integer('min_order').notNull().default(0),
  maxUses: integer('max_uses'),
  uses: integer('uses').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Social media automation ----------

export const socialPostKindEnum = pgEnum('social_post_kind', ['offer', 'promo', 'manual']);
export const socialPostStatusEnum = pgEnum('social_post_status', ['draft', 'scheduled', 'publishing', 'posted', 'partial', 'failed', 'cancelled']);
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'replied', 'needs_human', 'ignored', 'failed']);

export const socialPosts = pgTable('social_posts', {
  id: serial('id').primaryKey(),
  kind: socialPostKindEnum('kind').notNull(),
  caption: text('caption').notNull(),
  /** Public image URL Instagram/Facebook will fetch (our /api/social-image route or a product photo). */
  imageUrl: text('image_url').notNull(),
  link: text('link'),
  toFacebook: boolean('to_facebook').notNull().default(true),
  toInstagram: boolean('to_instagram').notNull().default(true),
  status: socialPostStatusEnum('status').notNull().default('scheduled'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  facebookPostId: varchar('facebook_post_id', { length: 80 }),
  instagramMediaId: varchar('instagram_media_id', { length: 80 }),
  couponCode: varchar('coupon_code', { length: 24 }),
  productIds: jsonb('product_ids').$type<number[]>().notNull().default([]),
  error: text('error'),
  ...timestamps,
}, (t) => [index('social_posts_due_idx').on(t.status, t.scheduledAt)]);

export const socialComments = pgTable('social_comments', {
  id: serial('id').primaryKey(),
  platform: varchar('platform', { length: 12 }).notNull(), // 'facebook' | 'instagram'
  externalId: varchar('external_id', { length: 80 }).notNull().unique(),
  postExternalId: varchar('post_external_id', { length: 80 }),
  authorName: varchar('author_name', { length: 120 }),
  text: text('text').notNull(),
  category: varchar('category', { length: 20 }), // question | praise | complaint | spam | other
  reply: text('reply'),
  status: commentStatusEnum('status').notNull().default('pending'),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  error: text('error'),
  ...timestamps,
}, (t) => [index('social_comments_status_idx').on(t.status)]);

/** One row (id = 1) of marketing automation switches, editable by the owner. */
export const marketingSettings = pgTable('marketing_settings', {
  id: integer('id').primaryKey().default(1),
  autoPostEnabled: boolean('auto_post_enabled').notNull().default(true),
  autoReplyEnabled: boolean('auto_reply_enabled').notNull().default(true),
  promoPostsPerWeek: integer('promo_posts_per_week').notNull().default(3),
  /** Hour of day (IST) for scheduled posts. */
  postHourIst: integer('post_hour_ist').notNull().default(19),
  brandVoice: text('brand_voice').notNull().default('Warm, helpful and proud of original products. Simple English with a light Hinglish touch when it fits. Never pushy.'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Simple per-key rate limiting that works across serverless instances. */
export const rateLimits = pgTable('rate_limits', {
  key: varchar('key', { length: 200 }).primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
});

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type User = typeof users.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type SocialComment = typeof socialComments.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
