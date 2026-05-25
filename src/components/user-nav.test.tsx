// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSignOut = vi.fn();
const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenuButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { UserNav } from '@/components/user-nav';

function setupSession(overrides: Record<string, unknown> = {}) {
  mockUseSession.mockReturnValue({
    data: {
      user: {
        name: 'John Doe',
        email: 'john@test.com',
        role: 'ADMIN',
        ...overrides,
      },
    },
    status: 'authenticated',
  });
}

describe('UserNav', () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockSignOut.mockReset();
  });

  it('renders nothing when session is null', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    const { container } = render(<UserNav />);
    expect(container.innerHTML).toBe('');
  });

  it('shows user name and email', () => {
    setupSession();
    render(<UserNav />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('shows user initials from name', () => {
    setupSession();
    render(<UserNav />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows first letter of email when name is missing', () => {
    setupSession({ name: null });
    render(<UserNav />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows sign out button in dropdown', async () => {
    const user = userEvent.setup();
    setupSession();
    render(<UserNav />);
    // Open dropdown by clicking the trigger button
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('calls signOut when sign out button is clicked', async () => {
    const user = userEvent.setup();
    setupSession();
    render(<UserNav />);
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    await user.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('shows change password option in dropdown', async () => {
    const user = userEvent.setup();
    setupSession();
    render(<UserNav />);
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('shows role badge in dropdown', async () => {
    const user = userEvent.setup();
    setupSession({ role: 'ADMIN' });
    render(<UserNav />);
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows Manage Users link for ADMIN role', async () => {
    const user = userEvent.setup();
    setupSession({ role: 'ADMIN' });
    render(<UserNav />);
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  it('hides Manage Users link for STAFF role', async () => {
    const user = userEvent.setup();
    setupSession({ role: 'STAFF' });
    render(<UserNav />);
    const trigger = screen.getByText('john@test.com').closest('button')!;
    await user.click(trigger);
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
  });

  it('shows Manage Events link for MANAGER role', async () => {
    const user = userEvent.setup();
    setupSession({ role: 'MANAGER' });
    render(<UserNav />);
    const trigger = screen.getByText('John Doe').closest('button')!;
    await user.click(trigger);
    expect(screen.getByText('Manage Events')).toBeInTheDocument();
  });
});
