import React from 'react';
import { Box, Text, Flex, Button, Spinner, Card, CardBody, HStack, VStack, Icon, Switch, Input, Item, Label } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '@/providers';

export default function SettingsScreen() {
  const { user, signOut } = useAuthContext();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [currency, setCurrency] = React.useState('INR');
  const [loading, setLoading] = React.useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <Flex h="100%" bg="gray.50" p={4}>
      <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={4}>Settings</Text>

      <Card variant="elevated" shadow={1} borderRadius="lg" mb={4} overflow="hidden">
        <CardBody p={4}>
          <HStack alignItems="center" space={3}>
            <Box bg="primary.100" p={3} borderRadius="xl"><Icon as={Ionicons} name="person" size="xl" color="primary.500" /></Box>
            <VStack alignItems="flex-start" space={1} flex={1}>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">{user?.email?.split('@')[0] || 'Owner'}</Text>
              <Text fontSize="sm" color="gray.500">{user?.email}</Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>Preferences</Text>
      <Card variant="elevated" shadow={1} borderRadius="lg" mb={4} overflow="hidden">
        <CardBody p={4}>
          <VStack space={3} alignItems="stretch">
            <HStack justifyContent="space-between" alignItems="center">
              <VStack alignItems="flex-start" space={1}>
                <Text fontWeight="medium">Dark Mode</Text>
                <Text fontSize="sm" color="gray.500">Use dark theme</Text>
              </VStack>
              <Switch checked={darkMode} onValueChange={setDarkMode} colorScheme="primary" />
            </HStack>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack alignItems="flex-start" space={1}>
                <Text fontWeight="medium">Push Notifications</Text>
                <Text fontSize="sm" color="gray.500">Receive payment reminders</Text>
              </VStack>
              <Switch checked={notifications} onValueChange={setNotifications} colorScheme="primary" />
            </HStack>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack alignItems="flex-start" space={1}>
                <Text fontWeight="medium">Currency</Text>
                <Text fontSize="sm" color="gray.500">Default currency for amounts</Text>
              </VStack>
              <Input value={currency} onChangeText={setCurrency} w="120px" placeholder="INR" />
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>Data Management</Text>
      <Card variant="elevated" shadow={1} borderRadius="lg" mb={4} overflow="hidden">
        <CardBody p={4}>
          <VStack space={3} alignItems="stretch">
            <Button variant="outline" colorScheme="blue" leftIcon={<Icon as={Ionicons} name="download" size="md" />}>Export Data (CSV)</Button>
            <Button variant="outline" colorScheme="green" leftIcon={<Icon as={Ionicons} name="cloud-upload" size="md" />}>Backup to Cloud</Button>
            <Button variant="outline" colorScheme="orange" leftIcon={<Icon as={Ionicons} name="refresh" size="md" />}>Restore from Backup</Button>
          </VStack>
        </CardBody>
      </Card>

      <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} mt={4}>About</Text>
      <Card variant="elevated" shadow={1} borderRadius="lg" mb={4} overflow="hidden">
        <CardBody p={4}>
          <VStack space={2} alignItems="stretch">
            <HStack justifyContent="space-between"><Text>App Version</Text><Text fontWeight="medium" color="gray.500">1.0.0</Text></HStack>
            <HStack justifyContent="space-between"><Text>Build</Text><Text fontWeight="medium" color="gray.500">2024.11.12</Text></HStack>
            <Button variant="ghost" colorScheme="blue" onPress={() => Alert.alert('License', 'MIT License')} leftIcon={<Icon as={Ionicons} name="document-text" size="md" />}>View License</Button>
          </VStack>
        </CardBody>
      </Card>

      <Button variant="outline" colorScheme="red" onPress={handleSignOut} isLoading={loading} leftIcon={<Icon as={Ionicons} name="log-out" size="md" />} mt={4}>Sign Out</Button>
    </Flex>
  );
}