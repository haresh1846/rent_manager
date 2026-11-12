import React from 'react';
import { Box, Text, Flex, Button, Spinner, Icon } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useLeases, useCreateLease } from '@/hooks/useLeases';

export default function LeasesScreen() {
  const { data, isLoading, refetch } = useLeases();
  const createLease = useCreateLease();
  const [showModal, setShowModal] = React.useState(false);

  const leases = data?.data || [];

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center"><Spinner size="lg" color="primary.500" /></Flex>;

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <HStack justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">Leases</Text>
        <Button onPress={() => setShowModal(true)} colorScheme="primary" leftIcon={<Icon as={Ionicons} name="document" size="md" />}>Create Lease</Button>
      </HStack>
      <Box>
        {leases.map((item: any) => (
          <Box key={item.id} bg="white" p={4} mb={3} borderRadius="lg" shadow={1}>
            <VStack alignItems="flex-start" space={2} w="100%">
              <HStack justifyContent="space-between" w="100%">
                <VStack alignItems="flex-start" space={1}>
                  <Text fontSize="lg" fontWeight="bold">{item.property?.name || 'Unknown Property'}</Text>
                  <Text fontSize="sm" color="gray.500">{item.tenant?.name || 'Unknown Tenant'}</Text>
                </VStack>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="primary.500">{item.monthly_rent}/month</Text>
                  <Text fontSize="xs" color="gray.400">Advance: {item.advance_balance}</Text>
                </Box>
              </HStack>
              <HStack space={3}>
                <Text fontSize="sm" color="gray.500">Start: {item.start_date}</Text>
                <Text fontSize="sm" color="gray.500">End: {item.end_date || 'Ongoing'}</Text>
                <Text fontSize="sm" fontWeight="medium" color={item.status === 'active' ? 'green.500' : 'gray.500'}>{item.status}</Text>
              </HStack>
            </VStack>
          </Box>
        ))}
        {leases.length === 0 && <Text textAlign="center" color="gray.500" mt={4}>No leases yet. Tap + to create.</Text>}
      </Box>
    </Flex>
  );
}