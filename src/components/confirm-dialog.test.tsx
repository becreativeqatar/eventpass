// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/confirm-dialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: 'Delete Item',
  description: 'Are you sure you want to delete this item?',
  onConfirm: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ConfirmDialog {...defaultProps} {...overrides} />);
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    defaultProps.onOpenChange.mockReset();
    defaultProps.onConfirm.mockReset();
  });

  it('renders title and description', () => {
    renderDialog();
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('uses default labels when confirmLabel and cancelLabel are not provided', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders custom confirm and cancel labels', () => {
    renderDialog({ confirmLabel: 'Yes, delete', cancelLabel: 'No, keep' } as Partial<typeof defaultProps>);
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, keep' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onOpenChange).toHaveBeenCalled();
  });

  it('applies destructive variant class to confirm button', () => {
    renderDialog({ variant: 'destructive' } as Partial<typeof defaultProps>);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toContain('destructive');
  });

  it('disables both buttons when loading is true', () => {
    renderDialog({ loading: true } as Partial<typeof defaultProps>);
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows "Processing..." text when loading', () => {
    renderDialog({ loading: true } as Partial<typeof defaultProps>);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
