export const PROPERTY_TYPES = [
  { value: 'shop', label: 'Shop' },
  { value: 'house', label: 'House' },
] as const;

export const PROPERTY_STATUSES = [
  { value: 'vacant', label: 'Vacant', color: 'gray' },
  { value: 'occupied', label: 'Occupied', color: 'green' },
  { value: 'maintenance', label: 'Maintenance', color: 'orange' },
] as const;

export const LEASE_STATUSES = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'gray' },
  { value: 'terminated', label: 'Terminated', color: 'red' },
] as const;

export const PAYMENT_TYPES = [
  { value: 'rent', label: 'Rent' },
  { value: 'advance', label: 'Advance' },
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'partial', label: 'Partial', color: 'orange' },
  { value: 'pending', label: 'Pending', color: 'blue' },
  { value: 'advance_used', label: 'Advance Used', color: 'purple' },
] as const;

export const ADVANCE_TRANSACTION_TYPES = [
  { value: 'credit', label: 'Credit (Add)', color: 'green' },
  { value: 'debit', label: 'Debit (Use)', color: 'red' },
] as const;

export const ID_PROOF_TYPES = [
  'Aadhar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'Other',
] as const;

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export const CURRENCY_SYMBOL = '₹';
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

export const PAGINATION_PAGE_SIZE = 20;