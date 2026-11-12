import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsService } from '@/services/database';
import type { TenantFormData } from '@/schemas';

export const useTenants = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['tenants', page, pageSize],
    queryFn: () => tenantsService.getAll(page, pageSize),
  });
};

export const useTenant = (id: string) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsService.getById(id),
    enabled: !!id,
  });
};

export const useTenantsByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['tenants', 'property', propertyId],
    queryFn: () => tenantsService.getByProperty(propertyId),
    enabled: !!propertyId,
  });
};

export const useSearchTenants = (query: string) => {
  return useQuery({
    queryKey: ['tenants-search', query],
    queryFn: () => tenantsService.search(query),
    enabled: query.length >= 2,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TenantFormData) => tenantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TenantFormData> }) => 
      tenantsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => tenantsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};