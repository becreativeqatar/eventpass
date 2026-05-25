'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        // Fetch session to check role for proper redirect
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user?.role === 'VALIDATOR') {
          window.location.href = '/validator';
        } else {
          window.location.href = callbackUrl;
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <Image
          src="/images/bce-logo.webp"
          alt="Be Creative Events"
          width={180}
          height={54}
          className="h-16 w-auto object-contain"
          priority
        />
      </div>

      {/* Login card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to EventPass</h1>
          <p className="text-sm text-muted-foreground mt-1">Accreditation Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="pl-10 h-11 bg-[#f5f3f0] border-0 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 h-11 bg-[#f5f3f0] border-0 focus-visible:ring-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bce-gradient hover:opacity-90 text-white font-semibold text-sm tracking-wide rounded-xl transition-all duration-200 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          <button
            type="button"
            onClick={() => { setForgotMode(true); setError(''); }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            Forgot password?
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {forgotMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {forgotSent ? (
              <div className="text-center">
                <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-bold mb-2">Check Your Email</h2>
                <p className="text-sm text-muted-foreground mb-6">If an account exists with that email, we sent a password reset link.</p>
                <Button onClick={() => { setForgotMode(false); setForgotSent(false); }} variant="outline" className="w-full rounded-xl">
                  Back to Login
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-1">Reset Password</h2>
                <p className="text-sm text-muted-foreground mb-4">Enter your email and we&apos;ll send you a reset link.</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotLoading(true);
                  try {
                    await fetch('/api/auth/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });
                    setForgotSent(true);
                  } finally {
                    setForgotLoading(false);
                  }
                }} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="pl-10 h-11 bg-[#f5f3f0] border-0 focus-visible:ring-primary"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bce-gradient hover:opacity-90 text-white font-semibold rounded-xl" disabled={forgotLoading}>
                    {forgotLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Reset Link'}
                  </Button>
                  <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                    Back to login
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Powered by <span className="font-semibold">b.creative events</span>
      </p>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm mx-4">
      <div className="flex flex-col items-center mb-10">
        <Image
          src="/images/bce-logo.webp"
          alt="Be Creative Events"
          width={180}
          height={54}
          className="h-16 w-auto object-contain"
          priority
        />
      </div>
      <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to EventPass</h1>
          <p className="text-sm text-muted-foreground mt-1">Accreditation Management System</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
