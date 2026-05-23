// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReinstateDialog } from '@/components/accreditation/reinstate-dialog';

const defaultProps = {
  accreditationId: 'acc-456',
  personName: 'Jane Smith',
  currentStatus: 'REVOKED',
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ReinstateDialog {...defaultProps} {...overrides} />);
}

describe('ReinstateDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onOpenChange.mockReset();
    defaultProps.onSuccess.mockReset();
  });

  it('renders dialog with title and person name', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: /reinstate accreditation/i })).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays current status in the description', () => {
    renderDialog();
    expect(screen.getByText('REVOKED')).toBeInTheDocument();
  });

  it('shows notes as optional', () => {
    renderDialog();
    expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
  });

  it('allows submit without notes since notes are optional', () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /reinstate accreditation/i });
    expect(submitBtn).toBeEnabled();
  });

  it('calls API with correct ID and notes on submit', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock;

    renderDialog();
    const textarea = screen.getByPlaceholderText(/add any notes/i);
    await user.type(textarea, 'Reinstating per manager request');
    await user.click(screen.getByRole('button', { name: /reinstate accreditation/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/acc-456/reinstate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Reinstating per manager request' }),
      });
    });
  });

  it('calls onSuccess and closes dialog after successful reinstate', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderDialog();
    await user.click(screen.getByRole('button', { name: /reinstate accreditation/i }));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledOnce();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error message when API returns an error', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Cannot reinstate' }),
    });

    renderDialog();
    await user.click(screen.getByRole('button', { name: /reinstate accreditation/i }));

    await waitFor(() => {
      expect(screen.getByText('Cannot reinstate')).toBeInTheDocument();
    });
  });

  it('calls onOpenChange(false) and resets state on cancel', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
