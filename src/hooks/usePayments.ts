import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '@/services/payments';
import type { PaymentFormData } from '@/schemas';

export const usePayments = (page = 1, pageSize = 20, filters?: { leaseId?: string; month?: number; year?: number }) => {
  return useQuery({
    queryKey: ['payments', page, pageSize, filters],
    queryFn: () => paymentsService.getAll(page, pageSize, filters),
  });
};

export const usePayment = (id: string) => {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentsService.getById(id),
    enabled: !!id,
  });
};

export const usePaymentsByLease = (leaseId: string) => {
  return useQuery({
    queryKey: ['payments', 'lease', leaseId],
    queryFn: () => paymentsService.getByLease(leaseId),
    enabled: !!leaseId,
  });
};

export const usePaymentsByMonthYear = (month: number, year: number) => {
  return useQuery({
    queryKey: ['payments', 'month-year', month, year],
    queryFn: () => paymentsService.getByMonthYear(month, year),
    enabled: !!month && !!year,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PaymentFormData) => paymentsService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'lease', variables.lease_id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PaymentFormData> }) => 
      paymentsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};