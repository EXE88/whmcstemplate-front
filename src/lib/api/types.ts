/**
 * Response shapes of the WHMCS Bridge API.
 *
 * Derived from the bridge's normalisers, not only from its OpenAPI file: several
 * endpoints are typed as bare `object` in the schema but return a stable,
 * documented shape. Money is always a decimal *string* and dates are ISO
 * Gregorian strings — neither is ever widened to `number`/`Date` here, because
 * the formatting layer is what converts them.
 */

export type Money = string;
export type IsoDate = string;

export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: T[];
}

/* -- auth ----------------------------------------------------------------- */

export interface SessionUser {
  email: string;
  whmcs_client_id: number;
  two_factor_enabled?: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
  user: SessionUser;
}

export interface Profile {
  whmcs_client_id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  status: string;
  currency_code: string;
  credit: Money;
  created_at: IsoDate;
  email_opt_out?: boolean;
  two_factor_enabled?: boolean;
}

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}

export interface Contact {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

/* -- catalogue ------------------------------------------------------------ */

export const BILLING_CYCLES = [
  "onetime",
  "monthly",
  "quarterly",
  "semiannually",
  "annually",
  "biennially",
  "triennially",
] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Cycles a product can actually be sold on, in display order. */
export const SELLABLE_CYCLES: BillingCycle[] = [
  "monthly",
  "quarterly",
  "semiannually",
  "annually",
  "biennially",
  "triennially",
];

/** One currency's price list for a product. Missing cycle = not offered. */
export type ProductPricing = Partial<Record<BillingCycle | "setup", Money>>;

export interface Product {
  id: number;
  group_id: number;
  type: string;
  name: string;
  description: string;
  module: string;
  payment_type: string;
  pricing: Record<string, ProductPricing>;
}

export interface TldPrice {
  categories: string[];
  register: Money | null;
  transfer: Money | null;
  renew: Money | null;
  grace_period: unknown;
  redemption_period: unknown;
}

/** Empty object is a valid, expected answer on a fresh install. */
export type TldPricing = Record<string, TldPrice>;

export interface DomainLookup {
  domain: string;
  available: boolean;
  whois: string;
}

export interface PaymentMethod {
  module: string;
  name: string;
}

/* -- services ------------------------------------------------------------- */

export interface Service {
  id: number;
  product_id: number;
  group: string;
  name: string;
  domain: string;
  status: string;
  billing_cycle: string;
  amount: Money;
  first_payment: Money;
  registered_at: IsoDate;
  next_due_date: IsoDate;
  server_hostname: string;
  dedicated_ip: string;
  username: string;
  disk_limit: string;
  bandwidth_limit: string;
}

export interface UpgradeQuote {
  in_progress: boolean;
  old_product_id: number;
  old_product_name: string;
  new_product_id: number;
  new_product_name: string;
  billing_cycle: string;
  days_until_renewal: number;
  total_days: number;
  price: Money;
  order_id: number;
  invoice_id: number;
  payment_url: string | null;
}

/* -- domains -------------------------------------------------------------- */

export interface Domain {
  id: number;
  domain: string;
  status: string;
  registrar: string;
  registration_period: number;
  registered_at: IsoDate;
  expires_at: IsoDate;
  next_due_date: IsoDate;
  amount: Money;
  auto_renew: boolean;
  id_protection: boolean;
}

export interface NameserverPayload {
  nameservers: string[];
}

export interface DomainLock {
  locked: boolean;
}

export interface EppResult {
  epp_code: string | null;
  delivery: "inline" | "emailed_to_owner";
}

/* -- billing -------------------------------------------------------------- */

export interface InvoiceItem {
  id: number;
  type: string;
  relation_id: number;
  description: string;
  amount: Money;
  taxed: number;
}

export interface Transaction {
  id: number;
  invoice_id: number;
  date: IsoDate;
  gateway: string;
  description: string;
  amount_in: Money;
  amount_out: Money;
  fees: Money;
  currency: string;
  transaction_id: string;
}

export interface Invoice {
  id: number;
  number: string;
  status: string;
  date: IsoDate;
  due_date: IsoDate;
  date_paid: IsoDate;
  subtotal: Money;
  tax: Money;
  credit: Money;
  total: Money;
  currency_code: string;
  payment_method: string;
  /** Detail responses only. */
  items?: InvoiceItem[];
  transactions?: Transaction[];
  notes?: string;
  payment_url?: string | null;
}

export interface CreditEntry {
  id: number;
  date: IsoDate;
  description: string;
  amount: Money;
}

export interface CreditBalance {
  balance: Money;
  currency_code: string;
  entries: CreditEntry[];
}

export interface PayMethod {
  id: number;
  type: string;
  description: string;
  is_default: number;
}

/* -- orders --------------------------------------------------------------- */

export interface OrderLineItem {
  type: string;
  relation_id: number;
  product_type: string;
  product: string;
  domain: string;
  billing_cycle: string;
  amount: Money;
  status: string;
}

export interface Order {
  id: number;
  order_number: string;
  invoice_id: number;
  date: IsoDate;
  status: string;
  payment_status: string;
  amount: Money;
  payment_method: string;
  promo_code: string;
  items: OrderLineItem[];
  payment_url?: string | null;
}

export interface OrderProductItem {
  type: "product";
  product_id: number;
  billing_cycle: BillingCycle;
  quantity?: number;
  domain?: string;
  hostname?: string;
  addons?: number[];
  config_options?: Record<string, string>;
  custom_fields?: Record<string, string>;
}

export interface OrderDomainItem {
  type: "domain";
  domain: string;
  action: "register" | "transfer";
  years: number;
  epp_code?: string;
  id_protection?: boolean;
  dns_management?: boolean;
  email_forwarding?: boolean;
}

export type OrderItem = OrderProductItem | OrderDomainItem;

export interface OrderCreatePayload {
  items: OrderItem[];
  payment_method: string;
  promo_code?: string;
  nameservers?: string[];
}

export interface OrderCreateResult {
  order_id: number;
  invoice_id: number;
  service_ids: number[];
  domain_ids: number[];
  addon_ids: number[];
  payment_url: string | null;
}

/* -- support -------------------------------------------------------------- */

export interface Department {
  id: number;
  name: string;
  awaiting_reply: number;
  open_tickets: number;
}

export interface TicketAttachment {
  index: number;
  filename: string;
  type: "ticket" | "reply";
  related_id: number;
}

export interface TicketReply {
  id: number;
  author: string;
  author_type: "staff" | "client";
  message: string;
  created_at: IsoDate;
  attachments: TicketAttachment[];
}

export interface Ticket {
  id: number;
  ticket_number: string;
  department: string;
  department_id: number;
  subject: string;
  status: string;
  priority: string;
  created_at: IsoDate;
  updated_at: IsoDate;
  service: string;
  /** Detail responses only. */
  attachments?: TicketAttachment[];
  replies?: TicketReply[];
}

export type TicketPriority = "Low" | "Medium" | "High";

/* -- filters -------------------------------------------------------------- */

export type InvoiceStatus = "Unpaid" | "Paid" | "Overdue" | "Cancelled" | "Refunded";
export type OrderStatus = "Pending" | "Active" | "Fraud" | "Cancelled";
export type ServiceStatus =
  | "Active"
  | "Pending"
  | "Suspended"
  | "Terminated"
  | "Cancelled"
  | "Fraud";
export type TicketStatus =
  | "Open"
  | "Answered"
  | "Customer-Reply"
  | "Closed"
  | "In Progress"
  | "On Hold";
