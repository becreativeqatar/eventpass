'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

interface AccreditationResult {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  accreditationNumber: string;
  status: string;
}

interface UserResult {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const STATUS_DOT: Record<string, string> = {
  APPROVED: 'bg-success',
  PENDING: 'bg-warning',
  REJECTED: 'bg-destructive',
  DRAFT: 'bg-muted-foreground',
  REVOKED: 'bg-destructive',
};

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [accreditations, setAccreditations] = useState<AccreditationResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setAccreditations([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setAccreditations(data.accreditations || []);
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  const hasResults = accreditations.length > 0 || users.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search accreditations, users..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query.length >= 2 && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!loading && query.length < 2 && (
          <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
        )}

        {accreditations.length > 0 && (
          <CommandGroup heading="Accreditations">
            {accreditations.map((acc) => (
              <CommandItem
                key={acc.id}
                value={`${acc.firstName} ${acc.lastName} ${acc.accreditationNumber}`}
                onSelect={() => handleSelect(`/admin/records/${acc.id}`)}
              >
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{acc.firstName} {acc.lastName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{acc.accreditationNumber}</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[acc.status] || 'bg-muted-foreground'}`} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {accreditations.length > 0 && users.length > 0 && <CommandSeparator />}

        {users.length > 0 && (
          <CommandGroup heading="Users">
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.name} ${user.email}`}
                onSelect={() => handleSelect('/admin/users')}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{user.name || user.email}</span>
                  <span className="text-xs text-muted-foreground ml-2">{user.role}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
