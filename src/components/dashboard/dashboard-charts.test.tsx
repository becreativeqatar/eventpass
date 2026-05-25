// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';

// Mock recharts — jsdom cannot render SVG-based charts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
}));

const validData = {
  scanActivity: [
    { date: '2025-05-01', label: 'Mon', scans: 10 },
    { date: '2025-05-02', label: 'Tue', scans: 5 },
  ],
  funnel: [
    { name: 'Pending', value: 10, color: '#737373' },
    { name: 'Approved', value: 20, color: '#16a34a' },
  ],
};

const emptyData = {
  scanActivity: [
    { date: '2025-05-01', label: 'Mon', scans: 0 },
    { date: '2025-05-02', label: 'Tue', scans: 0 },
  ],
  funnel: [
    { name: 'Pending', value: 0, color: '#737373' },
    { name: 'Approved', value: 0, color: '#16a34a' },
  ],
};

describe('DashboardCharts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when initialData is null', () => {
    const { container } = render(<DashboardCharts initialData={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when all data values are zero', () => {
    const { container } = render(<DashboardCharts initialData={emptyData} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders chart titles with valid data', () => {
    render(<DashboardCharts initialData={validData} />);
    expect(screen.getByText('Scan Activity (7 days)')).toBeInTheDocument();
    expect(screen.getByText('Accreditation Status')).toBeInTheDocument();
  });

  it('renders bar chart container with scan data', () => {
    render(<DashboardCharts initialData={validData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders pie chart container with funnel data', () => {
    render(<DashboardCharts initialData={validData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows "No scan data yet" when only funnel has data', () => {
    const data = {
      scanActivity: [{ date: '2025-05-01', label: 'Mon', scans: 0 }],
      funnel: [{ name: 'Approved', value: 5, color: '#16a34a' }],
    };
    render(<DashboardCharts initialData={data} />);
    expect(screen.getByText('No scan data yet')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows "No accreditation data yet" when only scan has data', () => {
    const data = {
      scanActivity: [{ date: '2025-05-01', label: 'Mon', scans: 3 }],
      funnel: [{ name: 'Pending', value: 0, color: '#737373' }],
    };
    render(<DashboardCharts initialData={data} />);
    expect(screen.getByText('No accreditation data yet')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders responsive containers for both charts', () => {
    render(<DashboardCharts initialData={validData} />);
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers).toHaveLength(2);
  });
});
