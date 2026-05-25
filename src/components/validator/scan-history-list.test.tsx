// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { ScanHistoryList } from '@/components/validator/scan-history-list';

const mockScans = [
  {
    id: 'scan-1',
    phase: 'LIVE',
    result: 'ALLOWED',
    scannedAt: new Date().toISOString(),
    accreditation: {
      firstName: 'Alice',
      lastName: 'Smith',
      company: 'Acme Corp',
    },
  },
  {
    id: 'scan-2',
    phase: 'BUMP_IN',
    result: 'DENIED',
    scannedAt: new Date().toISOString(),
    accreditation: {
      firstName: 'Bob',
      lastName: 'Jones',
      company: null,
    },
  },
];

describe('ScanHistoryList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders scan entries with name, result, and phase', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockScans }),
    });

    render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('DENIED')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Bump In')).toBeInTheDocument();
  });

  it('shows company name when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockScans }),
    });

    render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  it('shows N/A when company is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockScans }),
    });

    render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('renders nothing when scans array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const { container } = render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      // The component returns null when scans.length === 0
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders nothing when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { container } = render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders the Recent Scans heading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockScans }),
    });

    render(<ScanHistoryList userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Recent Scans')).toBeInTheDocument();
    });
  });

  it('passes correct query params to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    global.fetch = fetchMock;

    render(<ScanHistoryList userId="user-42" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/scans?scannedById=user-42&limit=10');
    });
  });

  it('renders nothing while loading', () => {
    // Fetch never resolves so the component stays in loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { container } = render(<ScanHistoryList userId="user-1" />);
    // Component returns null while loading
    expect(container.innerHTML).toBe('');
  });
});
