import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box, Text, Flex, Button, Input, Icon, VStack, HStack } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = (data: any) => {
    signUp(data.email, data.password).then(({ error }) => {
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Account Created', 'Please check your email to verify your account.');
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
              <Text fontSize="md" color="gray.500" textAlign="center" mt={1}>Create your account</Text>
            </Box>

            <Box borderRadius="xl" w="100%" p={6} bg="white" borderWidth={1} borderColor="gray.100" shadow={3}>
              <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={1} textAlign="center">Sign Up</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>Create your owner account</Text>

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack space={4} alignItems="stretch">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>Email</Text>
                    <Input
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      {...register('email')}
                      error={!!errors.email}
                      leftElement={<Icon as={Ionicons} name="mail" size="md" color="gray.400" />}
                    />
                    {errors.email && <Text fontSize="xs" color="danger.500" mt={1}>{errors.email.message}</Text>}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>Password</Text>
                    <Input
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      {...register('password')}
                      error={!!errors.password}
                      leftElement={<Icon as={Ionicons} name="lock-closed" size="md" color="gray.400" />}
                    />
                    {errors.password && <Text fontSize="xs" color="danger.500" mt={1}>{errors.password.message}</Text>}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>Confirm Password</Text>
                    <Input
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                      error={!!errors.confirmPassword}
                      leftElement={<Icon as={Ionicons} name="lock-closed" size="md" color="gray.400" />}
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
                    Create Account
                  </Button>
                </VStack>
              </form>

              <HStack space={2} mt={4} alignItems="center" justifyContent="center">
                <Text fontSize="sm" color="gray.500">Already have an account?</Text>
                <Text fontSize="sm" fontWeight="medium" color="primary.500" onPress={() => router.replace('/(auth)/login')}>Sign In</Text>
              </HStack>
            </Box>

            <Text fontSize="xs" color="gray.400" textAlign="center" numberOfLines={2}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Flex>
  );
}