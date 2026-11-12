import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leasesService } from '@/services/leases';
import type { LeaseFormData } from '@/schemas';

export const useLeases = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['leases', page, pageSize],
    queryFn: () => leasesService.getAll(page, pageSize),
  });
};

export const useLease = (id: string) => {
  return useQuery({
    queryKey: ['lease', id],
    queryFn: () => leasesService.getById(id),
    enabled: !!id,
  });
};

export const useLeasesByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['leases', 'property', propertyId],
    queryFn: () => leasesService.getByProperty(propertyId),
    enabled: !!propertyId,
  });
};

export const useActiveLeaseByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['leases', 'active', propertyId],
    queryFn: () => leasesService.getActiveByProperty(propertyId),
    enabled: !!propertyId,
  });
};

export const useCreateLease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LeaseFormData) => leasesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useUpdateLease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeaseFormData> }) => 
      leasesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
    },
  });
};

export const useDeleteLease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => leasesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};