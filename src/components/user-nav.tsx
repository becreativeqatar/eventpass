'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, ChevronsUpDown, KeyRound, Loader2, Users, CalendarDays, Check, X } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/validations/password';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] || 'U').toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  VALIDATOR: 'Validator',
};

export function UserNav() {
  const { data: session } = useSession();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  if (!session?.user) return null;

  const { name, email, role } = session.user;
  const initials = getInitials(name, email);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    const checks = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ];
    if (checks.some((c) => !c)) {
      setPwError('Password does not meet all requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Failed to change password');
      } else {
        toast.success('Password changed successfully');
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPwError('Something went wrong');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name || email}</span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="w-56"
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <span>{name || email}</span>
            <Badge variant="secondary" className="text-[10px]">
              {ROLE_LABELS[role as string] || role}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(role === 'ADMIN' || role === 'MANAGER') && (
            <DropdownMenuItem asChild>
              <Link href="/admin/events">
                <CalendarDays className="mr-2 h-4 w-4" />
                Manage Events
              </Link>
            </DropdownMenuItem>
          )}
          {role === 'ADMIN' && (
            <DropdownMenuItem asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPwError(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 py-4">
              {pwError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm">
                  {pwError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPw">Current Password</Label>
                <Input
                  id="currentPw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPw">New Password</Label>
                <Input
                  id="newPw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
                {newPassword.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {PASSWORD_REQUIREMENTS.map((req, i) => {
                      const passed = [
                        newPassword.length >= 8,
                        /[A-Z]/.test(newPassword),
                        /[a-z]/.test(newPassword),
                        /[0-9]/.test(newPassword),
                        /[^A-Za-z0-9]/.test(newPassword),
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
              <div className="space-y-2">
                <Label htmlFor="confirmPw">Confirm New Password</Label>
                <Input
                  id="confirmPw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
