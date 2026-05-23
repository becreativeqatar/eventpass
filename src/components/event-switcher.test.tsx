// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { EventSwitcher } from '@/components/event-switcher';
import type { EventSummary } from '@/contexts/event-context';

const mockSelectEvent = vi.fn();
const mockUseEventContext = vi.fn();

vi.mock('@/contexts/event-context', () => ({
  useEventContext: () => mockUseEventContext(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'ADMIN' } }, status: 'authenticated' }),
}));

// SidebarMenuButton requires SidebarProvider context — mock sidebar primitives
vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenuButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props} data-testid="sidebar-menu-button">{children}</button>
  ),
}));

function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: 'evt-1',
    name: 'Default Event',
    code: 'DEF',
    status: 'ACTIVE',
    description: null,
    venue: null,
    eventDate: null,
    _count: { accreditations: 0 },
    ...overrides,
  };
}

describe('EventSwitcher', () => {
  beforeEach(() => {
    mockUseEventContext.mockReset();
    mockSelectEvent.mockReset();
  });

  it('renders loading skeleton when isLoading is true', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: null,
      events: [],
      isLoading: true,
      selectEvent: mockSelectEvent,
    });
    const { container } = render(<EventSwitcher />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders loading skeleton when selectedProject is null and not loading', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: null,
      events: [],
      isLoading: false,
      selectEvent: mockSelectEvent,
    });
    const { container } = render(<EventSwitcher />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders the selected project name and code', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: makeEvent({ name: 'Qatar Open', code: 'QO25' }),
      events: [makeEvent({ name: 'Qatar Open', code: 'QO25' })],
      isLoading: false,
      selectEvent: mockSelectEvent,
    });
    render(<EventSwitcher />);
    expect(screen.getByText('Qatar Open')).toBeInTheDocument();
    expect(screen.getByText('QO25')).toBeInTheDocument();
  });

  it('renders the trigger button with project info', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: makeEvent({ name: 'World Cup', code: 'WC22' }),
      events: [makeEvent({ name: 'World Cup', code: 'WC22' })],
      isLoading: false,
      selectEvent: mockSelectEvent,
    });
    render(<EventSwitcher />);
    const trigger = screen.getByTestId('sidebar-menu-button');
    expect(trigger).toBeInTheDocument();
  });

  it('does not render skeleton when project is selected', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: makeEvent(),
      events: [makeEvent()],
      isLoading: false,
      selectEvent: mockSelectEvent,
    });
    const { container } = render(<EventSwitcher />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeInTheDocument();
  });

  it('renders with multiple events of different statuses', () => {
    const events = [
      makeEvent({ id: '1', name: 'Active Event', status: 'ACTIVE' }),
      makeEvent({ id: '2', name: 'Completed Event', status: 'COMPLETED' }),
      makeEvent({ id: '3', name: 'Archived Event', status: 'ARCHIVED' }),
      makeEvent({ id: '4', name: 'Draft Event', status: 'DRAFT' }),
    ];
    mockUseEventContext.mockReturnValue({
      selectedProject: events[0],
      events,
      isLoading: false,
      selectEvent: mockSelectEvent,
    });
    render(<EventSwitcher />);
    expect(screen.getByText('Active Event')).toBeInTheDocument();
  });
});
