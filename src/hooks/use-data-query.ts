"use client";

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useFirebase } from '@/components/firebase-provider';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  Unsubscribe
} from 'firebase/firestore';
import type { 
  Customer, 
  Product, 
  Order, 
  Invoice, 
  Estimate, 
  Vendor,
  CompanySettings 
} from '@/types';
import { useEffect } from 'react';

// Query keys for cache management
export const dataKeys = {
  all: ['data'] as const,
  customers: () => [...dataKeys.all, 'customers'] as const,
  customer: (id: string) => [...dataKeys.customers(), id] as const,
  products: () => [...dataKeys.all, 'products'] as const,
  product: (id: string) => [...dataKeys.products(), id] as const,
  orders: () => [...dataKeys.all, 'orders'] as const,
  order: (id: string) => [...dataKeys.orders(), id] as const,
  invoices: () => [...dataKeys.all, 'invoices'] as const,
  invoice: (id: string) => [...dataKeys.invoices(), id] as const,
  estimates: () => [...dataKeys.all, 'estimates'] as const,
  estimate: (id: string) => [...dataKeys.estimates(), id] as const,
  vendors: () => [...dataKeys.all, 'vendors'] as const,
  vendor: (id: string) => [...dataKeys.vendors(), id] as const,
  companySettings: () => [...dataKeys.all, 'companySettings'] as const,
};

/**
 * Hook to fetch customers with caching and real-time updates
 */
export function useCustomers() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dataKeys.customers(),
    queryFn: async (): Promise<Customer[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'customers'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Set up real-time listener for live updates
  useEffect(() => {
    if (!db) return;

    let unsubscribe: Unsubscribe;

    // Only set up real-time listener if we have cached data
    if (query.data) {
      unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
        const customers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
        queryClient.setQueryData(dataKeys.customers(), customers);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, query.data, queryClient]);

  return query;
}

/**
 * Hook to fetch products with caching and real-time updates
 */
export function useProducts() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dataKeys.products(),
    queryFn: async (): Promise<Product[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'products'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Set up real-time listener for live updates
  useEffect(() => {
    if (!db) return;

    let unsubscribe: Unsubscribe;

    if (query.data) {
      unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
        const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        queryClient.setQueryData(dataKeys.products(), products);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, query.data, queryClient]);

  return query;
}

/**
 * Hook to fetch orders with caching and real-time updates
 */
export function useOrders() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dataKeys.orders(),
    queryFn: async (): Promise<Order[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'orders'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 2, // 2 minutes (orders change more frequently)
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  useEffect(() => {
    if (!db) return;

    let unsubscribe: Unsubscribe;

    if (query.data) {
      unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        queryClient.setQueryData(dataKeys.orders(), orders);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, query.data, queryClient]);

  return query;
}

/**
 * Hook to fetch invoices with caching and real-time updates
 */
export function useInvoices() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dataKeys.invoices(),
    queryFn: async (): Promise<Invoice[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'invoices'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  useEffect(() => {
    if (!db) return;

    let unsubscribe: Unsubscribe;

    if (query.data) {
      unsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
        queryClient.setQueryData(dataKeys.invoices(), invoices);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, query.data, queryClient]);

  return query;
}

/**
 * Hook to fetch estimates with caching and real-time updates
 */
export function useEstimates() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dataKeys.estimates(),
    queryFn: async (): Promise<Estimate[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'estimates'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Estimate));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (!db) return;

    let unsubscribe: Unsubscribe;

    if (query.data) {
      unsubscribe = onSnapshot(collection(db, 'estimates'), (snapshot) => {
        const estimates = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Estimate));
        queryClient.setQueryData(dataKeys.estimates(), estimates);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, query.data, queryClient]);

  return query;
}

/**
 * Hook to fetch vendors with caching
 */
export function useVendors() {
  const { db } = useFirebase();

  return useQuery({
    queryKey: dataKeys.vendors(),
    queryFn: async (): Promise<Vendor[]> => {
      if (!db) throw new Error('Database not initialized');
      const snapshot = await getDocs(collection(db, 'vendors'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor));
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 15, // 15 minutes (vendors change less frequently)
    gcTime: 1000 * 60 * 60, // 60 minutes
  });
}

/**
 * Hook to fetch company settings with caching
 */
export function useCompanySettings() {
  const { db } = useFirebase();

  return useQuery({
    queryKey: dataKeys.companySettings(),
    queryFn: async (): Promise<CompanySettings | null> => {
      if (!db) throw new Error('Database not initialized');
      const docRef = doc(db, 'companySettings', 'main');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as CompanySettings) : null;
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 30, // 30 minutes (settings change rarely)
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}

/**
 * Mutation hooks for data updates
 */

// Customer mutations
export function useCustomerMutations() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>): Promise<string> => {
      if (!db) throw new Error('Database not initialized');
      const docRef = await addDoc(collection(db, 'customers'), customer);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.customers() });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...customer }: Customer): Promise<void> => {
      if (!db) throw new Error('Database not initialized');
      await setDoc(doc(db, 'customers', id), customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.customers() });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');
      await deleteDoc(doc(db, 'customers', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.customers() });
    },
  });

  return { addCustomer, updateCustomer, deleteCustomer };
}

// Product mutations
export function useProductMutations() {
  const { db } = useFirebase();
  const queryClient = useQueryClient();

  const addProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id'>): Promise<string> => {
      if (!db) throw new Error('Database not initialized');
      const docRef = await addDoc(collection(db, 'products'), product);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.products() });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: Product): Promise<void> => {
      if (!db) throw new Error('Database not initialized');
      await setDoc(doc(db, 'products', id), product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.products() });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');
      await deleteDoc(doc(db, 'products', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataKeys.products() });
    },
  });

  return { addProduct, updateProduct, deleteProduct };
}

/**
 * Hook to invalidate all data cache
 * Use this when major data changes happen
 */
export function useInvalidateData() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: dataKeys.all }),
    invalidateCustomers: () => queryClient.invalidateQueries({ queryKey: dataKeys.customers() }),
    invalidateProducts: () => queryClient.invalidateQueries({ queryKey: dataKeys.products() }),
    invalidateOrders: () => queryClient.invalidateQueries({ queryKey: dataKeys.orders() }),
    invalidateInvoices: () => queryClient.invalidateQueries({ queryKey: dataKeys.invoices() }),
    invalidateEstimates: () => queryClient.invalidateQueries({ queryKey: dataKeys.estimates() }),
    invalidateVendors: () => queryClient.invalidateQueries({ queryKey: dataKeys.vendors() }),
    invalidateCompanySettings: () => queryClient.invalidateQueries({ queryKey: dataKeys.companySettings() }),
  };
}