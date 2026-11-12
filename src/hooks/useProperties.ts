import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/database';
import type { PropertyFormData } from '@/schemas';

export const useProperties = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['properties', page, pageSize],
    queryFn: () => propertiesService.getAll(page, pageSize),
  });
};

export const useProperty = (id: string) => {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesService.getById(id),
    enabled: !!id,
  });
};

export const useSearchProperties = (query: string) => {
  return useQuery({
    queryKey: ['properties-search', query],
    queryFn: () => propertiesService.search(query),
    enabled: query.length >= 2,
  });
};

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PropertyFormData) => propertiesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyFormData> }) => 
      propertiesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
    },
  });
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => propertiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};