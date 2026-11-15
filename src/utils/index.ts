import { format, parseISO, isValid } from 'date-fns';
import { CURRENCY_SYMBOL, DATE_FORMAT } from '@/constants';

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 10000000) {
    return `${CURRENCY_SYMBOL}${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `${CURRENCY_SYMBOL}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

// Date formatting
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, DATE_FORMAT);
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
};

export const getMonthYearLabel = (month: number, year: number): string => {
  const date = new Date(year, month - 1);
  return format(date, 'MMMM yyyy');
};

export const getCurrentMonthYear = (): { month: number; year: number } => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);
};

// String helpers
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const titleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Number helpers
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Deep clone
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
export const isEmpty = (obj: Record<string, unknown>): boolean => {
  return Object.keys(obj).length === 0;
};

// Sleep utility
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};