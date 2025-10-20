
import type { Customer } from '@/types';
  
  export function getCustomerDisplayName(customer: Customer | null | undefined): string {
    if (!customer) {
        return "Customer";
    }

    const companyName = customer.companyName?.trim();
    if (companyName) {
        return companyName;
    }
  
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    if (fullName) {
        return fullName;
    }
  
    const primaryEmail = customer.email?.trim() 
    || customer.emailContacts?.find(c => c.type === 'Main Contact')?.email?.trim() 
    || customer.emailContacts?.[0]?.email?.trim();

    if (primaryEmail) {
        return primaryEmail;
    }

    if (customer.phone?.trim()) {
        return customer.phone.trim();
    }
  
    return "Customer";
  }
  
