// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';

const mockUseSession = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: React.PropsWithChildren) => <aside>{children}</aside>,
  SidebarContent: ({ children }: React.PropsWithChildren) => <nav>{children}</nav>,
  SidebarFooter: ({ children }: React.PropsWithChildren) => <footer>{children}</footer>,
  SidebarGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  SidebarHeader: ({ children }: React.PropsWithChildren) => <header>{children}</header>,
  SidebarMenu: ({ children }: React.PropsWithChildren) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: React.PropsWithChildren) => <li>{children}</li>,
  SidebarMenuButton: ({ children, asChild, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  useSidebar: () => ({ toggleSidebar: vi.fn(), open: true }),
}));

vi.mock('@/components/user-nav', () => ({
  UserNav: () => <div data-testid="user-nav">UserNav</div>,
}));

vi.mock('@/components/event-switcher', () => ({
  EventSwitcher: () => <div data-testid="event-switcher">EventSwitcher</div>,
}));

import { AppSidebar } from '@/components/app-sidebar';

function setupSession(role: string) {
  mockUseSession.mockReturnValue({
    data: { user: { name: 'Test User', email: 'test@test.com', role } },
    status: 'authenticated',
  });
}

describe('AppSidebar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/admin');
  });

  it('renders navigation links for ADMIN role', () => {
    setupSession('ADMIN');
    render(<AppSidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Scan History')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders the Overview group for ADMIN', () => {
    setupSession('ADMIN');
    render(<AppSidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
  });

  it('renders the Scanner group for VALIDATOR role', () => {
    setupSession('VALIDATOR');
    render(<AppSidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Scanner')).toBeInTheDocument();
    expect(screen.getByText('QR Scanner')).toBeInTheDocument();
  });

  it('hides Event group links for VALIDATOR role', () => {
    setupSession('VALIDATOR');
    render(<AppSidebar />);
    expect(screen.queryByText('Records')).not.toBeInTheDocument();
    expect(screen.queryByText('Scan History')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
  });

  it('hides Scanner group for ADMIN role', () => {
    setupSession('ADMIN');
    render(<AppSidebar />);
    expect(screen.queryByText('Scanner')).not.toBeInTheDocument();
    expect(screen.queryByText('QR Scanner')).not.toBeInTheDocument();
  });

  it('shows Event group for STAFF role', () => {
    setupSession('STAFF');
    render(<AppSidebar />);
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('hides Scanner group for STAFF role', () => {
    setupSession('STAFF');
    render(<AppSidebar />);
    expect(screen.queryByText('QR Scanner')).not.toBeInTheDocument();
  });

  it('renders MANAGER role with Event group', () => {
    setupSession('MANAGER');
    render(<AppSidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.queryByText('QR Scanner')).not.toBeInTheDocument();
  });

  it('renders EventSwitcher and UserNav', () => {
    setupSession('ADMIN');
    render(<AppSidebar />);
    expect(screen.getByTestId('event-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('user-nav')).toBeInTheDocument();
  });

  it('renders the app logo and title', () => {
    setupSession('ADMIN');
    render(<AppSidebar />);
    expect(screen.getByAltText('BCE')).toBeInTheDocument();
    expect(screen.getByText('EventPass')).toBeInTheDocument();
  });
});
