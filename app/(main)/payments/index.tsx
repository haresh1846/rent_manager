import React from 'react';
import { Box, Text, Flex, Button, Spinner, Icon, HStack, VStack, Badge } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { usePayments, useCreatePayment } from '@/hooks/usePayments';
import { PAYMENT_TYPES, PAYMENT_STATUSES } from '@/constants';
import { formatCurrency } from '@/utils';
import { getCurrentMonthYear } from '@/utils';

export default function PaymentsScreen() {
  const { month, year } = getCurrentMonthYear();
  const { data, isLoading, refetch } = usePayments(1, 20, { month, year });
  const createPayment = useCreatePayment();
  const [showModal, setShowModal] = React.useState(false);

  const payments = data?.data || [];

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center"><Spinner size="lg" color="primary.500" /></Flex>;

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <HStack justifyContent="space-between" alignItems="center" mb={4}>
        <VStack alignItems="flex-start" space={1}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">Payments</Text>
          <Text fontSize="sm" color="gray.500">{month}/{year}</Text>
        </VStack>
        <Button onPress={() => setShowModal(true)} colorScheme="primary" leftIcon={<Icon as={Ionicons} name="cash" size="md" />}>Record Payment</Button>
      </HStack>
      <Box>
        {payments.map((item: any) => (
          <Box key={item.id} bg="white" p={4} mb={3} borderRadius="lg" shadow={1}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack alignItems="flex-start" space={1}>
                <HStack space={2} alignItems="center">
                  <Text fontSize="lg" fontWeight="bold">{item.tenant?.name || 'Unknown'}</Text>
                  <Badge variant="subtle" colorScheme={item.status === 'paid' ? 'green' : item.status === 'partial' ? 'orange' : item.status === 'advance_used' ? 'purple' : 'blue'}>{item.status}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">{item.property?.name || 'Unknown Property'}</Text>
                <Text fontSize="sm" color="gray.400">{item.payment_type} • {item.payment_date}</Text>
              </VStack>
              <Text fontSize="xl" fontWeight="bold" color="primary.500">{formatCurrency(item.amount)}</Text>
            </HStack>
          </Box>
        ))}
        {payments.length === 0 && <Text textAlign="center" color="gray.500" mt={4}>No payments recorded this month.</Text>}
      </Box>
    </Flex>
  );
}