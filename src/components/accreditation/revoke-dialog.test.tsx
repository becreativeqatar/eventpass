// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevokeDialog } from '@/components/accreditation/revoke-dialog';

const defaultProps = {
  accreditationId: 'acc-123',
  personName: 'John Doe',
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  return render(<RevokeDialog {...defaultProps} {...overrides} />);
}

describe('RevokeDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onOpenChange.mockReset();
    defaultProps.onSuccess.mockReset();
  });

  it('renders dialog with title and person name', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: /revoke accreditation/i })).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows the reason label as required', () => {
    renderDialog();
    expect(screen.getByText('Reason for revocation *')).toBeInTheDocument();
  });

  it('disables submit button when reason is empty', () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: /revoke accreditation/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when reason is provided', async () => {
    const user = userEvent.setup();
    renderDialog();
    const textarea = screen.getByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Violation of policy');
    const submitBtn = screen.getByRole('button', { name: /revoke accreditation/i });
    expect(submitBtn).toBeEnabled();
  });

  it('calls API with correct ID and reason on submit', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock;

    renderDialog();
    const textarea = screen.getByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Policy breach');
    await user.click(screen.getByRole('button', { name: /revoke accreditation/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/acc-123/revoke', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Policy breach' }),
      });
    });
  });

  it('calls onSuccess and closes dialog after successful revoke', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderDialog();
    const textarea = screen.getByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Reason text');
    await user.click(screen.getByRole('button', { name: /revoke accreditation/i }));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledOnce();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error message when API returns an error', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Already revoked' }),
    });

    renderDialog();
    const textarea = screen.getByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Some reason');
    await user.click(screen.getByRole('button', { name: /revoke accreditation/i }));

    await waitFor(() => {
      expect(screen.getByText('Already revoked')).toBeInTheDocument();
    });
  });

  it('displays generic error when fetch throws', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderDialog();
    const textarea = screen.getByPlaceholderText(/enter the reason/i);
    await user.type(textarea, 'Some reason');
    await user.click(screen.getByRole('button', { name: /revoke accreditation/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onOpenChange(false) and resets state on cancel', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
