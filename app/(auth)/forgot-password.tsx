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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, loading } = useAuth();

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(z.object({ email: z.string().email('Invalid email address') })),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: any) => {
    resetPassword(data.email).then(({ error }) => {
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Reset Link Sent', 'Check your email for password reset instructions.');
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
              <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={1} textAlign="center">Forgot Password?</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>Enter your email to receive a reset link</Text>

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack space={4} alignItems="stretch">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>Email</Text>
                    <Controller
                      control={control}
                      name="email"
                      rules={{ required: 'Email is required', pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Invalid email' } }}
                      render={({ field }) => (
                        <Input
                          placeholder="you@example.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          {...field}
                          error={!!errors.email}
                          leftElement={<Icon as={Ionicons} name="mail" size="md" color="gray.400" />}
                        />
                      )}
                    />
                    {errors.email && <Text fontSize="xs" color="danger.500" mt={1}>{errors.email.message}</Text>}
                  </Box>

                  <Button
                    onPress={() => {}}
                    colorScheme="primary"
                    size="lg"
                    isLoading={loading}
                    _text={{ fontWeight: 'bold' }}
                  >
                    Send Reset Link
                  </Button>
                </VStack>
              </form>

              <HStack space={2} mt={4} alignItems="center" justifyContent="center">
                <Text fontSize="sm" color="gray.500">Remember your password?</Text>
                <Text fontSize="sm" fontWeight="medium" color="primary.500" onPress={() => router.replace('/(auth)/login')}>Sign In</Text>
              </HStack>
            </Box>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Flex>
  );
}