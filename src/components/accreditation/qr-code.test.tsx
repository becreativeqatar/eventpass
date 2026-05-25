// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';

const mockToDataURL = vi.fn();

vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: unknown[]) => mockToDataURL(...args),
  },
}));

import { QRCodeDisplay } from '@/components/accreditation/qr-code';

describe('QRCodeDisplay', () => {
  beforeEach(() => {
    mockToDataURL.mockReset();
  });

  it('shows loading state before QR code generates', () => {
    // Never resolve so we stay in loading state
    mockToDataURL.mockReturnValue(new Promise(() => {}));

    const { container } = render(<QRCodeDisplay token="abc123" />);
    const loadingDiv = container.querySelector('.animate-pulse');
    expect(loadingDiv).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders QR code image after generation', async () => {
    const fakeDataUrl = 'data:image/png;base64,fakedata';
    mockToDataURL.mockResolvedValue(fakeDataUrl);

    render(<QRCodeDisplay token="abc123" />);

    await waitFor(() => {
      const img = screen.getByAltText('Verification QR Code');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', fakeDataUrl);
    });
  });

  it('passes correct URL to QRCode.toDataURL', async () => {
    mockToDataURL.mockResolvedValue('data:image/png;base64,test');

    render(<QRCodeDisplay token="my-token" />);

    await waitFor(() => {
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.stringContaining('/verify/my-token'),
        expect.objectContaining({ width: 200, margin: 2 }),
      );
    });
  });

  it('uses custom size when provided', async () => {
    mockToDataURL.mockResolvedValue('data:image/png;base64,test');

    render(<QRCodeDisplay token="abc" size={300} />);

    await waitFor(() => {
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: 300 }),
      );
    });

    const img = screen.getByAltText('Verification QR Code');
    expect(img).toHaveAttribute('width', '300');
    expect(img).toHaveAttribute('height', '300');
  });

  it('uses default size of 200', async () => {
    mockToDataURL.mockResolvedValue('data:image/png;base64,test');

    render(<QRCodeDisplay token="abc" />);

    await waitFor(() => {
      const img = screen.getByAltText('Verification QR Code');
      expect(img).toHaveAttribute('width', '200');
      expect(img).toHaveAttribute('height', '200');
    });
  });

  it('loading placeholder matches the specified size', () => {
    mockToDataURL.mockReturnValue(new Promise(() => {}));

    const { container } = render(<QRCodeDisplay token="abc" size={150} />);
    const loadingDiv = container.querySelector('.animate-pulse');
    expect(loadingDiv).toHaveStyle({ width: '150px', height: '150px' });
  });
});
