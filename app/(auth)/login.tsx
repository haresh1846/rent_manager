import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box, Text, Flex, Button, Input, Icon, VStack, HStack } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authSchema } from '@/schemas';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithOtp, loading } = useAuth();
  const [isOtpMode, setIsOtpMode] = React.useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: any) => {
    if (isOtpMode) {
      signInWithOtp(data.email).then(({ error }) => {
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Magic Link Sent', 'Check your email for the login link.');
      });
    } else {
      signIn(data.email, data.password).then(({ error }) => {
        if (error) Alert.alert('Error', error.message);
        else router.replace('/(main)');
      });
    }
  };

  return (
    <Flex h="100%" bg="white" justifyContent="center" p={4}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
          <VStack alignItems="center" space={4} w="100%" maxW="400px" mx="auto">
            <Box>
              <Icon as={Ionicons} name="home" size="5xl" color="primary.500" mb={2} />
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" textAlign="center">Rent Manager</Text>
              <Text fontSize="md" color="gray.500" textAlign="center" mt={1}>Manage your properties with ease</Text>
            </Box>

            <Box borderRadius="xl" w="100%" p={6} bg="white" borderWidth={1} borderColor="gray.100" shadow={3}>
              <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={1} textAlign="center">
                {isOtpMode ? 'Magic Link Login' : 'Welcome Back'}
              </Text>
              <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
                {isOtpMode ? 'Enter your email to receive a login link' : 'Sign in to your account'}
              </Text>

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

                  {!isOtpMode && (
                    <Box>
                      <HStack justifyContent="space-between" alignItems="center" mb={1}>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700">Password</Text>
                        <Text fontSize="xs" color="primary.500" onPress={() => router.push('/(auth)/forgot-password')}>Forgot?</Text>
                      </HStack>
                      <Input
                        placeholder="••••••••"
                        secureTextEntry
                        autoComplete="password"
                        {...register('password')}
                        error={!!errors.password}
                        leftElement={<Icon as={Ionicons} name="lock-closed" size="md" color="gray.400" />}
                      />
                      {errors.password && <Text fontSize="xs" color="danger.500" mt={1}>{errors.password.message}</Text>}
                    </Box>
                  )}

                  <Button
                    onPress={() => {}}
                    colorScheme="primary"
                    size="lg"
                    isLoading={loading}
                    _text={{ fontWeight: 'bold' }}
                  >
                    {isOtpMode ? 'Send Magic Link' : 'Sign In'}
                  </Button>
                </VStack>
              </form>

              <HStack alignItems="center" space={2} mt={4}>
                <Box flex={1} borderBottomWidth={1} borderColor="gray.200" />
                <Text fontSize="sm" color="gray.500">or</Text>
                <Box flex={1} borderBottomWidth={1} borderColor="gray.200" />
              </HStack>

              <Button
                variant="outline"
                colorScheme="gray"
                size="lg"
                onPress={() => setIsOtpMode(!isOtpMode)}
                _text={{ fontWeight: 'medium' }}
              >
                {isOtpMode ? 'Use Password Instead' : 'Use Magic Link'}
              </Button>

              <HStack space={2} mt={4}>
                <Text fontSize="sm" color="gray.500">Don't have an account?</Text>
                <Text fontSize="sm" fontWeight="medium" color="primary.500" onPress={() => router.push('/(auth)/register')}>Sign Up</Text>
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