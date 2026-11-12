import React from 'react';
import { Box, Text, Flex, Button, Spinner, Input, Icon } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useTenants, useCreateTenant } from '@/hooks/useTenants';

export default function TenantsScreen() {
  const { data, isLoading, refetch } = useTenants();
  const createTenant = useCreateTenant();
  const [showModal, setShowModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const tenants = data?.data || [];

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center"><Spinner size="lg" color="primary.500" /></Flex>;

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <HStack justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">Tenants</Text>
        <Button onPress={() => setShowModal(true)} colorScheme="primary" leftIcon={<Icon as={Ionicons} name="person-add" size="md" />}>Add Tenant</Button>
      </HStack>
      <Input placeholder="Search tenants..." value={searchQuery} onChangeText={setSearchQuery} leftElement={<Icon as={Ionicons} name="search" size="md" color="gray.400" />} bg="white" borderRadius="md" mb={4} />
      <Box>
        {tenants.map((item: any) => (
          <Box key={item.id} bg="white" p={4} mb={3} borderRadius="lg" shadow={1}>
            <HStack justifyContent="space-between">
              <VStack alignItems="flex-start" space={1}>
                <Text fontSize="lg" fontWeight="bold">{item.name}</Text>
                <Text fontSize="sm" color="gray.500">{item.phone || 'No phone'}</Text>
                <Text fontSize="sm" color="gray.400">{item.email || 'No email'}</Text>
              </VStack>
            </HStack>
          </Box>
        ))}
        {tenants.length === 0 && <Text textAlign="center" color="gray.500" mt={4}>No tenants yet. Tap + to add.</Text>}
      </Box>
    </Flex>
  );
}