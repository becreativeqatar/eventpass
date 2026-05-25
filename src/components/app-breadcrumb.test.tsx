// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';

let mockPathname = '/admin/records';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import { AppBreadcrumb } from '@/components/app-breadcrumb';

describe('AppBreadcrumb', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });
  });

  it('returns null on dashboard root /admin', () => {
    mockPathname = '/admin';
    const { container } = render(<AppBreadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Dashboard link as home breadcrumb', () => {
    mockPathname = '/admin/records';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders path segment with mapped label', () => {
    mockPathname = '/admin/records';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Records')).toBeInTheDocument();
  });

  it('renders multiple segments', () => {
    mockPathname = '/admin/records/new';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders approvals path correctly', () => {
    mockPathname = '/admin/approvals';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Approvals')).toBeInTheDocument();
  });

  it('renders users path correctly', () => {
    mockPathname = '/admin/users';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders scans path with label "Scan History"', () => {
    mockPathname = '/admin/scans';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Scan History')).toBeInTheDocument();
  });

  it('renders unknown segment with title-cased label', () => {
    mockPathname = '/admin/some-custom-page';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Some Custom Page')).toBeInTheDocument();
  });

  it('renders edit page with correct breadcrumb chain', () => {
    mockPathname = '/admin/records/abc12345678901234567890/edit';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders validator/verify path with mapped labels', () => {
    mockPathname = '/validator/verify';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Verify')).toBeInTheDocument();
  });

  it('fetches dynamic label for record ID segment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { firstName: 'John', lastName: 'Doe', accreditationNumber: 'ACC-0001' },
        }),
    });
    global.fetch = fetchMock;

    mockPathname = '/admin/records/abc12345678901234567890';
    render(<AppBreadcrumb />);

    // Verify the fetch was called for the dynamic ID
    expect(fetchMock).toHaveBeenCalledWith('/api/accreditations/abc12345678901234567890');
  });

  it('renders reports path correctly', () => {
    mockPathname = '/admin/reports';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders import path with label "Bulk Import"', () => {
    mockPathname = '/admin/import';
    render(<AppBreadcrumb />);
    expect(screen.getByText('Bulk Import')).toBeInTheDocument();
  });
});
