import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Property, Tenant, Lease, Payment } from '@/types';

interface AppState {
  // User preferences
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  
  // UI state
  sidebarOpen: boolean;
  activeTab: string;
  
  // Filters
  propertyFilter: { type?: string; status?: string; search?: string };
  tenantFilter: { search?: string; propertyId?: string };
  leaseFilter: { status?: string; propertyId?: string };
  paymentFilter: { month?: number; year?: number; type?: string };
  
  // Actions
  setCurrency: (currency: string) => void;
  setDateFormat: (format: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setPropertyFilter: (filter: Partial<AppState['propertyFilter']>) => void;
  setTenantFilter: (filter: Partial<AppState['tenantFilter']>) => void;
  setLeaseFilter: (filter: Partial<AppState['leaseFilter']>) => void;
  setPaymentFilter: (filter: Partial<AppState['paymentFilter']>) => void;
  resetFilters: () => void;
}

const defaultFilters = {
  propertyFilter: {},
  tenantFilter: {},
  leaseFilter: {},
  paymentFilter: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Defaults
      currency: 'INR',
      dateFormat: 'dd/MM/yyyy',
      theme: 'system',
      sidebarOpen: false,
      activeTab: 'dashboard',
      ...defaultFilters,
      
      // Actions
      setCurrency: (currency) => set({ currency }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setPropertyFilter: (filter) => set((state) => ({ 
        propertyFilter: { ...state.propertyFilter, ...filter } 
      })),
      setTenantFilter: (filter) => set((state) => ({ 
        tenantFilter: { ...state.tenantFilter, ...filter } 
      })),
      setLeaseFilter: (filter) => set((state) => ({ 
        leaseFilter: { ...state.leaseFilter, ...filter } 
      })),
      setPaymentFilter: (filter) => set((state) => ({ 
        paymentFilter: { ...state.paymentFilter, ...filter } 
      })),
      resetFilters: () => set(defaultFilters),
    }),
    {
      name: 'rent-manager-settings',
      partialize: (state) => ({
        currency: state.currency,
        dateFormat: state.dateFormat,
        theme: state.theme,
      }),
    }
  )
);

// Separate store for data that shouldn't persist
interface DataState {
  currentProperty: Property | null;
  currentTenant: Tenant | null;
  currentLease: Lease | null;
  currentPayment: Payment | null;
  
  setCurrentProperty: (property: Property | null) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setCurrentLease: (lease: Lease | null) => void;
  setCurrentPayment: (payment: Payment | null) => void;
}

export const useDataStore = create<DataState>((set) => ({
  currentProperty: null,
  currentTenant: null,
  currentLease: null,
  currentPayment: null,
  
  setCurrentProperty: (currentProperty) => set({ currentProperty }),
  setCurrentTenant: (currentTenant) => set({ currentTenant }),
  setCurrentLease: (currentLease) => set({ currentLease }),
  setCurrentPayment: (currentPayment) => set({ currentPayment }),
}));