import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { Box, Text, Flex, HStack, VStack, Card, Icon, Badge, Spinner } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useDashboardStats, useOutstandingDues } from '@/hooks/useReports';
import { formatCurrency, formatCurrencyCompact } from '@/utils';
import { useAuthContext } from '@/providers';

export default function DashboardScreen() {
  const { data: stats, isLoading, refetch } = useDashboardStats();
  const { data: outstandingDues } = useOutstandingDues();
  const { user } = useAuthContext();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const statCards = [
    { title: 'Total Properties', value: stats?.totalProperties || 0, icon: 'business', color: 'primary.500', subtitle: `${stats?.occupiedProperties || 0} occupied, ${stats?.vacantProperties || 0} vacant` },
    { title: 'Active Tenants', value: stats?.totalTenants || 0, icon: 'people', color: 'secondary.500', subtitle: 'Currently leased' },
    { title: 'Due This Month', value: formatCurrencyCompact(stats?.totalDueThisMonth || 0), icon: 'cash', color: 'warning.500', subtitle: 'Expected collection' },
    { title: 'Collected', value: formatCurrencyCompact(stats?.totalCollectedThisMonth || 0), icon: 'check-circle', color: 'success.500', subtitle: `${stats?.collectionRate || 0}% collection rate` },
    { title: 'Outstanding', value: formatCurrencyCompact(stats?.totalOutstanding || 0), icon: 'alert-circle', color: 'danger.500', subtitle: 'Pending payments' },
    { title: 'Advance Balance', value: formatCurrencyCompact(stats?.totalAdvanceBalance || 0), icon: 'wallet', color: 'purple', subtitle: 'Available for shortfalls' },
  ];

  if (isLoading) return <Flex h="100%" justifyContent="center" alignItems="center" p={4}><Spinner size="lg" color="primary.500" /></Flex>;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 100 }}>
      <Box p={4} pb={2}>
        <HStack justifyContent="space-between" alignItems="center">
          <VStack alignItems="flex-start" space={1}>
            <Text fontSize="xl" fontWeight="bold" color="gray.800">Welcome back, {user?.email?.split('@')[0] || 'Owner'}!</Text>
            <Text fontSize="sm" color="gray.500">Here's your portfolio overview</Text>
          </VStack>
          <Icon as={Ionicons} name="person-circle" size="2xl" color="gray.300" />
        </HStack>
      </Box>

      <Box px={4} pb={4}>
        <Box flexDirection="row" flexWrap="wrap" space={3}>
          {statCards.map((stat, index) => (
            <Card key={index} w="48%" borderRadius="lg" overflow="hidden" bg="white" borderWidth={1} borderColor="gray.100" shadow={2}>
              <Box p={4}>
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack alignItems="flex-start" space={1}>
                    <Text fontSize="sm" color="gray.500" fontWeight="medium">{stat.title}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.800">{stat.value}</Text>
                    <Text fontSize="xs" color="gray.400">{stat.subtitle}</Text>
                  </VStack>
                  <Box bg={`${stat.color}10`} p={3} borderRadius="md" alignItems="center" justifyContent="center">
                    <Icon as={Ionicons} name={stat.icon} size="lg" color={stat.color} />
                  </Box>
                </HStack>
              </Box>
            </Card>
          ))}
        </Box>
      </Box>

      {outstandingDues && outstandingDues.length > 0 && <OutstandingDuesList dues={outstandingDues} />}
    </ScrollView>
  );
}

function OutstandingDuesList({ dues }: { dues: any[] }) {
  return (
    <Box px={4} pb={4}>
      <HStack justifyContent="space-between" alignItems="center" mb={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Outstanding Dues ({dues.length})</Text>
        <Badge colorScheme="red" variant="solid">{dues.length} pending</Badge>
      </HStack>
      <VStack space={2} maxH={300}>
        {dues.slice(0, 5).map((due, index) => (
          <Card key={index} borderRadius="md" bg="white" borderWidth={1} borderColor="gray.100" shadow={1} mb={2}>
            <Box p={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack alignItems="flex-start" space={1}>
                  <HStack space={2} alignItems="center">
                    <Icon as={Ionicons} name="home" size="md" color="gray.500" />
                    <Text fontWeight="medium" color="gray.700">{due.property_name}</Text>
                    <Icon as={Ionicons} name="person" size="md" color="gray.500" />
                    <Text fontSize="sm" color="gray.500">{due.tenant_name}</Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.400">Advance: {formatCurrency(due.advance_balance)}</Text>
                </VStack>
                <VStack alignItems="flex-end" space={1}>
                  <Text fontSize="lg" fontWeight="bold" color="danger.500">{formatCurrency(due.amount_due)}</Text>
                  <Badge colorScheme="orange" variant="soft">{due.months_due} month{due.months_due > 1 ? 's' : ''} due</Badge>
                </VStack>
              </HStack>
            </Box>
          </Card>
        ))}
        {dues.length > 5 && <Text textAlign="center" color="primary.500" fontSize="sm" fontWeight="medium">+{dues.length - 5} more... View all in Payments</Text>}
      </VStack>
    </Box>
  );
}