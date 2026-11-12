import React from 'react';
import { Box, Text, Flex, Spinner, Card, CardBody, HStack, VStack, Icon, Badge } from 'native-base';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMonthlyCollections, useAdvanceUtilization, useOutstandingDues } from '@/hooks/useReports';
import { formatCurrency, formatCurrencyCompact, getCurrentMonthYear } from '@/utils';

export default function ReportsScreen() {
  const { month, year } = getCurrentMonthYear();
  const { data: monthlyCollections } = useMonthlyCollections(year);
  const { data: advanceUtilization } = useAdvanceUtilization();
  const { data: outstandingDues } = useOutstandingDues();
  const [isLoading, setIsLoading] = React.useState(false);

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center"><Spinner size="lg" color="primary.500" /></Flex>;

  const totalCollected = monthlyCollections?.reduce((sum, m) => sum + m.collected, 0) || 0;
  const totalDue = monthlyCollections?.reduce((sum, m) => sum + m.due, 0) || 0;
  const totalOutstanding = monthlyCollections?.reduce((sum, m) => sum + m.outstanding, 0) || 0;

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={4}>Reports</Text>
      
      <Box flexDirection="row" flexWrap="wrap" gap={3} mb={4}>
        <Card variant="elevated" shadow={2} borderRadius="lg" overflow="hidden" flex={1} minWidth="150px">
          <CardBody p={4}><Text fontSize="sm" color="gray.500">Total Collected</Text><Text fontSize="2xl" fontWeight="bold" color="success.500">{formatCurrencyCompact(totalCollected)}</Text></CardBody>
        </Card>
        <Card variant="elevated" shadow={2} borderRadius="lg" overflow="hidden" flex={1} minWidth="150px">
          <CardBody p={4}><Text fontSize="sm" color="gray.500">Total Due</Text><Text fontSize="2xl" fontWeight="bold" color="primary.500">{formatCurrencyCompact(totalDue)}</Text></CardBody>
        </Card>
        <Card variant="elevated" shadow={2} borderRadius="lg" overflow="hidden" flex={1} minWidth="150px">
          <CardBody p={4}><Text fontSize="sm" color="gray.500">Outstanding</Text><Text fontSize="2xl" fontWeight="bold" color="danger.500">{formatCurrencyCompact(totalOutstanding)}</Text></CardBody>
        </Card>
      </Box>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>Monthly Collections ({year})</Text>
      <Box maxH={300} mb={4}>
        {monthlyCollections?.map((m, i) => (
          <Card key={i} variant="elevated" shadow={1} borderRadius="md" mb={2}>
            <CardBody p={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="medium">{m.month}/{m.year}</Text>
                <HStack space={4} alignItems="center">
                  <VStack alignItems="flex-end" space={1}><Text fontSize="xs" color="gray.500">Collected</Text><Text fontWeight="bold" color="success.500">{formatCurrency(m.collected)}</Text></VStack>
                  <VStack alignItems="flex-end" space={1}><Text fontSize="xs" color="gray.500">Due</Text><Text fontWeight="bold" color="primary.500">{formatCurrency(m.due)}</Text></VStack>
                  <VStack alignItems="flex-end" space={1}><Text fontSize="xs" color="gray.500">Outstanding</Text><Text fontWeight="bold" color={m.outstanding > 0 ? 'danger.500' : 'success.500'}>{formatCurrency(m.outstanding)}</Text></VStack>
                </HStack>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </Box>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>Outstanding Dues ({outstandingDues?.length || 0})</Text>
      <Box>
        {outstandingDues?.slice(0, 10).map((due, i) => (
          <Card key={i} variant="elevated" shadow={1} borderRadius="md" mb={2}>
            <CardBody p={3}>
              <HStack justifyContent="space-between">
                <VStack alignItems="flex-start" space={1}>
                  <Text fontWeight="medium">{due.property_name}</Text>
                  <Text fontSize="sm" color="gray.500">{due.tenant_name}</Text>
                  <Text fontSize="xs" color="gray.400">Advance: {formatCurrency(due.advance_balance)}</Text>
                </VStack>
                <VStack alignItems="flex-end" space={1}>
                  <Text fontSize="lg" fontWeight="bold" color="danger.500">{formatCurrency(due.amount_due)}</Text>
                  <Badge colorScheme="orange" variant="soft">{due.months_due} month(s) due</Badge>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </Box>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>Advance Utilization ({advanceUtilization?.length || 0})</Text>
      <Box>
        {advanceUtilization?.map((au, i) => (
          <Card key={i} variant="elevated" shadow={1} borderRadius="md" mb={2}>
            <CardBody p={3}>
              <HStack justifyContent="space-between">
                <VStack alignItems="flex-start" space={1}>
                  <Text fontWeight="medium">{au.property_name}</Text>
                  <Text fontSize="sm" color="gray.500">{au.tenant_name}</Text>
                </VStack>
                <VStack alignItems="flex-end" space={1}>
                  <HStack space={4}><VStack alignItems="flex-end"><Text fontSize="xs" color="gray.500">Initial</Text><Text fontWeight="bold">{formatCurrency(au.initial_advance)}</Text></VStack><VStack alignItems="flex-end"><Text fontSize="xs" color="gray.500">Used</Text><Text fontWeight="bold" color="danger.500">{formatCurrency(au.total_used)}</Text></VStack><VStack alignItems="flex-end"><Text fontSize="xs" color="gray.500">Balance</Text><Text fontWeight="bold" color="primary.500">{formatCurrency(au.current_balance)}</Text></VStack></HStack>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </Box>
    </Flex>
  );
}