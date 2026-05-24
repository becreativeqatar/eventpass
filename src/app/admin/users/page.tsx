'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Users, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: {
    projects: number;
    accreditations: number;
    scans: number;
  };
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-primary/10 text-primary' },
  { value: 'MANAGER', label: 'Manager', color: 'bg-chart-2/10 text-chart-2' },
  { value: 'STAFF', label: 'Staff', color: 'bg-success/10 text-success' },
  { value: 'VALIDATOR', label: 'Validator', color: 'bg-secondary text-secondary-foreground' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'STAFF' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser
          ? { name: formData.name, role: formData.role }
          : formData
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save user');
      }

      toast.success(editingUser ? 'User updated' : 'User created');
      setIsAddDialogOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'STAFF' });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      toast.success(`Deleted ${user.name || user.email}`);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
    setUserToDelete(null);
  };

  const handleResetPassword = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reset email');
      }
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name || '', email: user.email, role: user.role });
    setIsAddDialogOpen(true);
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'STAFF' });
    setError(null);
  };

  const getRoleBadge = (role: string) => {
    const roleInfo = ROLES.find(r => r.value === role);
    return (
      <Badge className={roleInfo?.color || 'bg-muted text-foreground'}>
        {roleInfo?.label || role}
      </Badge>
    );
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => <span className="font-medium">{user.name || '-'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => user.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => getRoleBadge(user.role),
    },
    {
      key: 'activity',
      header: 'Activity',
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {user._count.projects} projects, {user._count.accreditations} records, {user._count.scans} scans
        </span>
      ),
      mobileRender: false,
    },
    {
      key: 'created',
      header: 'Created',
      render: (user) => format(new Date(user.createdAt), 'MMM d, yyyy'),
      mobileRender: false,
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[100px]',
      render: (user) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset password" onClick={() => handleResetPassword(user)}>
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditDialog(user)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete" onClick={() => setUserToDelete(user)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      mobileRender: (user) => (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleResetPassword(user)}>
            <KeyRound className="h-3 w-3 mr-1" /> Reset PW
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(user)}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setUserToDelete(user)}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => open ? setIsAddDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user details' : 'Create a new user account'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription={search ? 'Try adjusting your search.' : 'Add your first user to get started.'}
        emptyAction={
          !search ? (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => { if (!open) setUserToDelete(null); }}
        title="Delete User"
        description={`Are you sure you want to delete ${userToDelete?.name || userToDelete?.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (userToDelete) handleDelete(userToDelete); }}
      />
    </div>
  );
}
