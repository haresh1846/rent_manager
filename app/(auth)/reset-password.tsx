import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box, Text, Flex, Button, Input, Icon, VStack, HStack } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, loading } = useAuth();

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = (data: any) => {
    updatePassword(data.password).then(({ error }) => {
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Password Updated', 'Your password has been reset successfully.');
        router.replace('/(auth)/login');
      }
    });
  };

  return (
    <Flex h="100%" bg="white" justifyContent="center" p={4}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <VStack alignItems="center" space={4} w="100%" maxW="400px" mx="auto">
            <Box>
              <Icon as={Ionicons} name="home" size="5xl" color="primary.500" mb={2} />
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" textAlign="center">Rent Manager</Text>
            </Box>

            <Box borderRadius="xl" w="100%" p={6} bg="white" borderWidth={1} borderColor="gray.100" shadow={3}>
              <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={1} textAlign="center">Set New Password</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>Enter your new password below</Text>

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack space={4} alignItems="stretch">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>New Password</Text>
                    <Controller
                      control={control}
                      name="password"
                      rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
                      render={({ field }) => (
                        <Input
                          placeholder="••••••••"
                          secureTextEntry
                          autoComplete="new-password"
                          {...field}
                          error={!!errors.password}
                          leftElement={<Icon as={Ionicons} name="lock-closed" size="md" color="gray.400" />}
                        />
                      )}
                    />
                    {errors.password && <Text fontSize="xs" color="danger.500" mt={1}>{errors.password.message}</Text>}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>Confirm Password</Text>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
                      render={({ field }) => (
                        <Input
                          placeholder="••••••••"
                          secureTextEntry
                          autoComplete="new-password"
                          {...field}
                          error={!!errors.confirmPassword}
                          leftElement={<Icon as={Ionicons} name="lock-closed" size="md" color="gray.400" />}
                        />
                      )}
                    />
                    {errors.confirmPassword && <Text fontSize="xs" color="danger.500" mt={1}>{errors.confirmPassword.message}</Text>}
                  </Box>

                  <Button
                    onPress={() => {}}
                    colorScheme="primary"
                    size="lg"
                    isLoading={loading}
                    _text={{ fontWeight: 'bold' }}
                  >
                    Update Password
                  </Button>
                </VStack>
              </form>

              <HStack space={2} mt={4} alignItems="center" justifyContent="center">
                <Text fontSize="sm" color="gray.500">Back to</Text>
                <Text fontSize="sm" fontWeight="medium" color="primary.500" onPress={() => router.replace('/(auth)/login')}>Sign In</Text>
              </HStack>
            </Box>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Flex>
  );
}