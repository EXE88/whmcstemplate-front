import type {
  InvoiceStatus,
  OrderStatus,
  ServiceStatus,
  TicketStatus,
} from "@/lib/api/types";

/** Central key registry so invalidation after a mutation is never guesswork. */
export const queryKeys = {
  products: (groupId?: number) => ["products", groupId ?? null] as const,
  tldPricing: () => ["tld-pricing"] as const,
  domainLookup: (domain: string) => ["domain-lookup", domain] as const,
  paymentMethods: () => ["payment-methods"] as const,

  profile: () => ["profile"] as const,
  contacts: () => ["contacts"] as const,

  services: (page: number, status: ServiceStatus | "") => ["services", page, status] as const,
  service: (id: number) => ["service", id] as const,
  upgradeOptions: (id: number) => ["upgrade-options", id] as const,

  domains: (page: number) => ["domains", page] as const,
  domain: (id: number) => ["domain", id] as const,
  nameservers: (id: number) => ["nameservers", id] as const,
  domainLock: (id: number) => ["domain-lock", id] as const,

  invoices: (page: number, status: InvoiceStatus | "") => ["invoices", page, status] as const,
  invoice: (id: number) => ["invoice", id] as const,
  transactions: (page: number) => ["transactions", page] as const,
  credit: () => ["credit"] as const,

  orders: (page: number, status: OrderStatus | "") => ["orders", page, status] as const,
  order: (id: number) => ["order", id] as const,

  departments: () => ["departments"] as const,
  tickets: (page: number, status: TicketStatus | "") => ["tickets", page, status] as const,
  ticket: (id: number) => ["ticket", id] as const,
} as const;
