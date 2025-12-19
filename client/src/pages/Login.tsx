import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { GoogleLogin } from '@react-oauth/google';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      return await res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiRequest('POST', '/api/auth/google', { token: credential });
      return await res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in with Google.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Google sign in failed.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-primary mb-2">Campus Barter</h1>
          <p className="text-muted-foreground">Your campus marketplace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@college.edu"
                          type="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit"
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-center flex-col items-center gap-2">
                {!import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <div className="text-sm text-destructive font-medium text-center bg-red-50 p-2 rounded w-full border border-red-200">
                    Configuration Error: Missing Google Client ID.
                    <br />
                    <span className="text-xs font-normal text-muted-foreground">Please set VITE_GOOGLE_CLIENT_ID in .env</span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={credentialResponse => {
                      if (credentialResponse.credential) {
                        googleLoginMutation.mutate(credentialResponse.credential);
                      }
                    }}
                    onError={() => {
                      toast({
                        title: 'Login Failed',
                        description: 'Google login was unsuccessful.',
                        variant: 'destructive'
                      });
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  Trusted by students
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
