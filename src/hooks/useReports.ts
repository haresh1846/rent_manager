import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports';
import { advanceTransactionsService } from '@/services/advanceTransactions';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsService.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useMonthlyCollections = (year: number) => {
  return useQuery({
    queryKey: ['reports', 'monthly-collections', year],
    queryFn: () => reportsService.getMonthlyCollections(year),
    enabled: !!year,
  });
};

export const useOutstandingDues = () => {
  return useQuery({
    queryKey: ['reports', 'outstanding-dues'],
    queryFn: () => reportsService.getOutstandingDues(),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAdvanceUtilization = () => {
  return useQuery({
    queryKey: ['reports', 'advance-utilization'],
    queryFn: () => reportsService.getAdvanceUtilization(),
  });
};

export const useAdvanceTransactions = (leaseId: string) => {
  return useQuery({
    queryKey: ['advance-transactions', leaseId],
    queryFn: () => advanceTransactionsService.getByLease(leaseId),
    enabled: !!leaseId,
  });
};