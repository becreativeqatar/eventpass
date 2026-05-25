// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { AccreditationHistory } from '@/components/accreditation/accreditation-history';

const mockHistory = [
  {
    id: 'h-1',
    action: 'CREATED',
    oldStatus: null,
    newStatus: 'PENDING',
    notes: null,
    performedAt: '2025-05-01T10:00:00Z',
    performedBy: { name: 'Admin User', email: 'admin@example.com' },
  },
  {
    id: 'h-2',
    action: 'APPROVED',
    oldStatus: 'PENDING',
    newStatus: 'APPROVED',
    notes: 'Looks good',
    performedAt: '2025-05-02T14:30:00Z',
    performedBy: { name: null, email: 'reviewer@example.com' },
  },
  {
    id: 'h-3',
    action: 'REJECTED',
    oldStatus: 'PENDING',
    newStatus: 'REJECTED',
    notes: 'Missing documents',
    performedAt: '2025-05-03T09:00:00Z',
    performedBy: { name: 'Manager', email: 'manager@example.com' },
  },
];

describe('AccreditationHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<AccreditationHistory accreditationId="acc-123" />);
    expect(screen.getByText('Activity History')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no history', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('No history recorded')).toBeInTheDocument();
    });
  });

  it('fetches history with correct accreditation ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    global.fetch = fetchMock;

    render(<AccreditationHistory accreditationId="acc-456" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/acc-456/history');
    });
  });

  it('renders history entries with action badges', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('CREATED')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });

  it('shows status transitions when oldStatus and newStatus are present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText(/PENDING → APPROVED/)).toBeInTheDocument();
      expect(screen.getByText(/PENDING → REJECTED/)).toBeInTheDocument();
    });
  });

  it('shows notes when present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      expect(screen.getByText('Looks good')).toBeInTheDocument();
      expect(screen.getByText('Missing documents')).toBeInTheDocument();
    });
  });

  it('shows performer name when available, email as fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      // name available -> show name
      expect(screen.getByText(/by Admin User on/)).toBeInTheDocument();
      // name is null -> show email
      expect(screen.getByText(/by reviewer@example.com on/)).toBeInTheDocument();
    });
  });

  it('renders all entries in order', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: mockHistory }),
    });
    render(<AccreditationHistory accreditationId="acc-123" />);

    await waitFor(() => {
      const badges = document.querySelectorAll('[data-slot="badge"]');
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent('CREATED');
      expect(badges[1]).toHaveTextContent('APPROVED');
      expect(badges[2]).toHaveTextContent('REJECTED');
    });
  });
});
