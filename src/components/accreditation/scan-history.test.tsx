// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScanHistory } from '@/components/accreditation/scan-history';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

const mockScans = [
  {
    id: 'scan-1',
    phase: 'CHECK_IN',
    result: 'ALLOWED',
    location: 'Gate A',
    notes: 'Smooth entry',
    device: 'iPhone 15',
    ipAddress: '192.168.1.1',
    scannedAt: '2025-05-01T09:00:00Z',
    scannedBy: { name: 'Guard 1', email: 'guard1@example.com' },
  },
  {
    id: 'scan-2',
    phase: 'CHECK_OUT',
    result: 'DENIED',
    location: null,
    notes: null,
    device: null,
    ipAddress: null,
    scannedAt: '2025-05-01T17:00:00Z',
    scannedBy: { name: null, email: 'guard2@example.com' },
  },
];

function mockFetchWith(data: { data: typeof mockScans; pagination?: Record<string, number> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('ScanHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ScanHistory accreditationId="acc-123" />);
    expect(screen.getByText('Scan History')).toBeInTheDocument();
  });

  it('renders empty state when no scans', async () => {
    mockFetchWith({ data: [], pagination: { total: 0, pages: 0 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('No scans recorded yet')).toBeInTheDocument();
    });
  });

  it('fetches scans with accreditationId param', async () => {
    const fetchMock = mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('accreditationId=acc-123');
    });
  });

  it('renders scan entries with result badges', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('ALLOWED')).toBeInTheDocument();
      expect(screen.getByText('DENIED')).toBeInTheDocument();
    });
  });

  it('renders phase badges', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('CHECK IN')).toBeInTheDocument();
      expect(screen.getByText('CHECK OUT')).toBeInTheDocument();
    });
  });

  it('shows location when present, dash when null', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('Gate A')).toBeInTheDocument();
    });
  });

  it('shows scanner name or email fallback', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('Guard 1')).toBeInTheDocument();
      expect(screen.getByText('guard2@example.com')).toBeInTheDocument();
    });
  });

  it('shows total scan count', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('2 total scans')).toBeInTheDocument();
    });
  });

  it('renders custom title', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" title="Entry Log" />);

    await waitFor(() => {
      expect(screen.getByText('Entry Log')).toBeInTheDocument();
    });
  });

  it('shows pagination controls when pages > 1', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 100, pages: 2 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });
  });

  it('does not show pagination when only 1 page', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });
  });

  it('fetches next page when Next is clicked', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchWith({ data: mockScans, pagination: { total: 100, pages: 2 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      const lastCallUrl = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string;
      expect(lastCallUrl).toContain('page=2');
    });
  });

  it('shows notes when present, dash when null', async () => {
    mockFetchWith({ data: mockScans, pagination: { total: 2, pages: 1 } });
    render(<ScanHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('Smooth entry')).toBeInTheDocument();
    });
  });
});
