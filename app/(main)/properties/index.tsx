import React from 'react';
import { Box, Text, Flex, Button, Spinner } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useProperties, useCreateProperty } from '@/hooks/useProperties';

export default function PropertiesScreen() {
  const { data, isLoading, refetch } = useProperties();
  const createProperty = useCreateProperty();
  const [showModal, setShowModal] = React.useState(false);

  const properties = data?.data || [];

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center"><Spinner size="lg" color="primary.500" /></Flex>;

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <HStack justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">Properties</Text>
        <Button onPress={() => setShowModal(true)} colorScheme="primary" leftIcon={<Icon as={Ionicons} name="add" size="md" />}>Add Property</Button>
      </HStack>
      <Box>
        {properties.map((item: any) => (
          <Box key={item.id} bg="white" p={4} mb={3} borderRadius="lg" shadow={1}>
            <HStack justifyContent="space-between">
              <VStack alignItems="flex-start" space={1}>
                <Text fontSize="lg" fontWeight="bold">{item.name}</Text>
                <Text fontSize="sm" color="gray.500">{item.address}</Text>
                <Text fontSize="sm" color="primary.500" fontWeight="medium">{item.monthly_rent}/month</Text>
              </VStack>
            </HStack>
          </Box>
        ))}
        {properties.length === 0 && <Text textAlign="center" color="gray.500" mt={4}>No properties yet. Tap + to add.</Text>}
      </Box>
    </Flex>
  );
}