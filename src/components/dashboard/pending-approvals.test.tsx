// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingApprovals } from '@/components/dashboard/pending-approvals';

// Mock next/link to render as a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockItems = [
  { id: 'acc-1', firstName: 'Alice', lastName: 'Smith', company: 'Acme Corp', role: 'Speaker' },
  { id: 'acc-2', firstName: 'Bob', lastName: 'Jones', company: null, role: 'Volunteer' },
];

function renderComponent(overrides: { items?: typeof mockItems; totalCount?: number } = {}) {
  const props = {
    items: overrides.items ?? mockItems,
    totalCount: overrides.totalCount ?? mockItems.length,
  };
  return render(<PendingApprovals {...props} />);
}

describe('PendingApprovals', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading', () => {
    renderComponent();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
  });

  it('renders empty state when no pending approvals', () => {
    renderComponent({ items: [], totalCount: 0 });
    expect(screen.getByText('No pending approvals')).toBeInTheDocument();
  });

  it('does not show Approve All button when empty', () => {
    renderComponent({ items: [], totalCount: 0 });
    expect(screen.queryByText('Approve All')).not.toBeInTheDocument();
  });

  it('shows the total count badge when totalCount > 0', () => {
    renderComponent({ totalCount: 5 });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show count badge when totalCount is 0', () => {
    renderComponent({ items: [], totalCount: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders list of pending approvals with names', () => {
    renderComponent();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders company and role info', () => {
    renderComponent();
    expect(screen.getByText('Acme Corp · Speaker')).toBeInTheDocument();
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
  });

  it('shows View, Approve and Decline buttons for each item', () => {
    renderComponent();
    const viewLinks = screen.getAllByText('View');
    const approveButtons = screen.getAllByText('Approve');
    const declineButtons = screen.getAllByText('Decline');
    expect(viewLinks).toHaveLength(2);
    expect(approveButtons).toHaveLength(2);
    expect(declineButtons).toHaveLength(2);
  });

  it('shows Approve All button when items exist', () => {
    renderComponent();
    expect(screen.getByText('Approve All')).toBeInTheDocument();
  });

  it('shows "View all N pending" link when totalCount > items.length', () => {
    renderComponent({ totalCount: 10 });
    expect(screen.getByText('View all 10 pending')).toBeInTheDocument();
  });

  it('calls approve API on Approve click and removes item', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock;

    renderComponent();
    const approveButtons = screen.getAllByText('Approve');
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/acc-1/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('opens reject dialog on Decline click', async () => {
    const user = userEvent.setup();
    renderComponent();
    const declineButtons = screen.getAllByText('Decline');
    await user.click(declineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Reject Accreditation')).toBeInTheDocument();
      expect(screen.getByText('Reason for rejection *')).toBeInTheDocument();
    });
  });

  it('disables reject submit when reason is empty', async () => {
    const user = userEvent.setup();
    renderComponent();
    const declineButtons = screen.getAllByText('Decline');
    await user.click(declineButtons[0]);

    await waitFor(() => {
      const rejectBtn = screen.getByRole('button', { name: /^reject$/i });
      expect(rejectBtn).toBeDisabled();
    });
  });

  it('calls reject API with reason and removes item', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock;

    renderComponent();
    const declineButtons = screen.getAllByText('Decline');
    await user.click(declineButtons[0]);

    const textarea = await screen.findByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Not eligible');
    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/acc-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not eligible' }),
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('shows View All link pointing to pending records', () => {
    renderComponent();
    const viewAllLink = screen.getByText('View All');
    expect(viewAllLink).toHaveAttribute('href', '/admin/records?status=PENDING');
  });
});
