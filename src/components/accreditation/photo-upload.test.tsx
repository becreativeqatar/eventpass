// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUpload } from '@/components/accreditation/photo-upload';

const defaultProps = {
  accreditationId: 'acc-123',
  currentPhotoUrl: null as string | null,
  onPhotoChange: vi.fn(),
};

function renderUpload(overrides: Partial<typeof defaultProps> = {}) {
  return render(<PhotoUpload {...defaultProps} {...overrides} />);
}

describe('PhotoUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onPhotoChange.mockReset();
  });

  it('renders upload area when no photo exists', () => {
    renderUpload();
    expect(screen.getByText('Click or drag photo')).toBeInTheDocument();
  });

  it('renders Upload Photo button when no photo exists', () => {
    renderUpload();
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument();
  });

  it('renders photo hint text', () => {
    renderUpload();
    expect(screen.getByText(/JPEG, PNG or WebP/)).toBeInTheDocument();
    expect(screen.getByText(/Max 5MB/)).toBeInTheDocument();
  });

  it('renders image preview when currentPhotoUrl is provided', () => {
    renderUpload({ currentPhotoUrl: 'https://example.com/photo.jpg' });
    const img = screen.getByAltText('Accreditation photo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows Change and Remove buttons when photo exists', () => {
    renderUpload({ currentPhotoUrl: 'https://example.com/photo.jpg' });
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('does not show Upload Photo button when photo exists', () => {
    renderUpload({ currentPhotoUrl: 'https://example.com/photo.jpg' });
    expect(screen.queryByRole('button', { name: /upload photo/i })).not.toBeInTheDocument();
  });

  it('shows error for invalid file type', async () => {
    renderUpload();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText('Only JPEG, PNG, and WebP images are allowed')).toBeInTheDocument();
    });
  });

  it('shows error for file exceeding 5MB', async () => {
    renderUpload();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file over 5MB
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const largeFile = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText('Image must be smaller than 5MB')).toBeInTheDocument();
    });
  });

  it('uploads file successfully and calls onPhotoChange', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { photoUrl: 'https://example.com/new.jpg' } }),
    });

    renderUpload();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/accreditations/acc-123/photo',
        expect.objectContaining({ method: 'POST' })
      );
      expect(defaultProps.onPhotoChange).toHaveBeenCalledWith('https://example.com/new.jpg');
    });
  });

  it('shows error when upload API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Storage full' }),
    });

    renderUpload();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText('Storage full')).toBeInTheDocument();
    });
  });

  it('shows generic error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderUpload();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('removes photo and calls onPhotoChange with null', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderUpload({ currentPhotoUrl: 'https://example.com/photo.jpg' });

    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/accreditations/acc-123/photo',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(defaultProps.onPhotoChange).toHaveBeenCalledWith(null);
    });
  });

  it('shows error when remove API fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Cannot delete' }),
    });

    renderUpload({ currentPhotoUrl: 'https://example.com/photo.jpg' });

    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete')).toBeInTheDocument();
    });
  });

  it('does not call remove when no photo exists', async () => {
    global.fetch = vi.fn();

    // Render without photo; the Remove button won't be visible
    renderUpload();

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles drag over state', () => {
    renderUpload();
    const dropZone = screen.getByText('Click or drag photo').closest('div[class*="border-dashed"]') as HTMLElement;
    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    expect(screen.getByText('Drop here')).toBeInTheDocument();
  });

  it('handles drag leave state', () => {
    renderUpload();
    const dropZone = screen.getByText('Click or drag photo').closest('div[class*="border-dashed"]') as HTMLElement;

    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    expect(screen.getByText('Drop here')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone, { preventDefault: vi.fn() });
    expect(screen.getByText('Click or drag photo')).toBeInTheDocument();
  });

  it('handles file drop', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { photoUrl: 'https://example.com/dropped.jpg' } }),
    });

    renderUpload();
    const dropZone = screen.getByText('Click or drag photo').closest('div[class*="border-dashed"]') as HTMLElement;

    const droppedFile = new File(['img'], 'dropped.png', { type: 'image/png' });

    fireEvent.drop(dropZone, {
      preventDefault: vi.fn(),
      dataTransfer: { files: [droppedFile] },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/accreditations/acc-123/photo',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
