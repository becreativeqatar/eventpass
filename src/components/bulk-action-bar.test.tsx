// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '@/components/bulk-action-bar';

const defaultProps = {
  selectedCount: 3,
  hasPending: true,
  hasDraft: true,
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onDelete: vi.fn(),
  onClear: vi.fn(),
};

function renderBar(overrides: Partial<typeof defaultProps> = {}) {
  return render(<BulkActionBar {...defaultProps} {...overrides} />);
}

describe('BulkActionBar', () => {
  beforeEach(() => {
    defaultProps.onApprove.mockReset();
    defaultProps.onReject.mockReset();
    defaultProps.onDelete.mockReset();
    defaultProps.onClear.mockReset();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = renderBar({ selectedCount: 0 });
    expect(container.innerHTML).toBe('');
  });

  it('renders selection count', () => {
    renderBar();
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons when hasPending is true', () => {
    renderBar({ hasPending: true, hasDraft: false });
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('hides Approve and Reject buttons when hasPending is false', () => {
    renderBar({ hasPending: false, hasDraft: true });
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('shows Delete button when hasDraft is true', () => {
    renderBar({ hasPending: false, hasDraft: true });
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Delete button when hasDraft is false', () => {
    renderBar({ hasPending: true, hasDraft: false });
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onApprove when Approve is clicked', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByText('Approve'));
    expect(defaultProps.onApprove).toHaveBeenCalledOnce();
  });

  it('calls onReject when Reject is clicked', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByText('Reject'));
    expect(defaultProps.onReject).toHaveBeenCalledOnce();
  });

  it('calls onDelete when Delete is clicked', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByText('Delete'));
    expect(defaultProps.onDelete).toHaveBeenCalledOnce();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(defaultProps.onClear).toHaveBeenCalledOnce();
  });

  it('shows all action buttons when both hasPending and hasDraft are true', () => {
    renderBar({ hasPending: true, hasDraft: true });
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows correct count for single selection', () => {
    renderBar({ selectedCount: 1 });
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});
