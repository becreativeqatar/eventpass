'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle, XCircle, Check, X } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/validations/password';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/validate-token?token=${encodeURIComponent(token)}`)
      .then(res => {
        setTokenValid(res.ok);
      })
      .catch(() => setTokenValid(false));
  }, [token]);

  if (!token) {
    return (
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground mb-6">This link is missing or malformed.</p>
          <Button onClick={() => router.push('/login')} className="w-full bce-gradient hover:opacity-90 text-white rounded-xl">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (tokenValid === null) {
    return (
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Link Expired</h1>
          <p className="text-sm text-muted-foreground mb-6">This link has already been used or has expired. Please request a new one.</p>
          <Button onClick={() => router.push('/login')} className="w-full bce-gradient hover:opacity-90 text-white rounded-xl">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Password Set</h1>
          <p className="text-sm text-muted-foreground mb-6">Your password has been set successfully. You can now sign in.</p>
          <Button onClick={() => router.push('/login')} className="w-full bce-gradient hover:opacity-90 text-white rounded-xl">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    if (checks.some((c) => !c)) {
      setError('Password does not meet all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to set password');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="flex flex-col items-center mb-10">
        <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight">Set Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a secure password for your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                autoFocus
                className="pl-10 h-11 bg-[#f5f3f0] border-0 focus-visible:ring-primary"
              />
            </div>
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_REQUIREMENTS.map((req, i) => {
                  const passed = [
                    password.length >= 8,
                    /[A-Z]/.test(password),
                    /[a-z]/.test(password),
                    /[0-9]/.test(password),
                    /[^A-Za-z0-9]/.test(password),
                  ][i];
                  return (
                    <li key={req} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {req}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                minLength={8}
                className="pl-10 h-11 bg-[#f5f3f0] border-0 focus-visible:ring-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bce-gradient hover:opacity-90 text-white font-semibold text-sm tracking-wide rounded-xl mt-2"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting password...</>
            ) : (
              'Set Password'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Powered by <span className="font-semibold">b.creative events</span>
      </p>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
