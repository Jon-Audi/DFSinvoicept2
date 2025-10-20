// Adjust this import if your Customer type lives elsewhere
export type Customer = {
    id: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    // add any other fields you actually have
  };
  
  export function getCustomerDisplayName(c: Customer): string {
    if (c.companyName && c.companyName.trim()) return c.companyName.trim();
  
    const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
  
    if (c.email && c.email.trim()) return c.email.trim();
    if (c.phone && c.phone.trim()) return c.phone.trim();
  
    return "Customer";
  }
  