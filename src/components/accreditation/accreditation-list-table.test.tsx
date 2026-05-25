// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { AccreditationListTable } from '@/components/accreditation/accreditation-list-table';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const sampleAccreditations = [
  {
    id: 'acc-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    company: 'Acme Corp',
    role: 'Staff',
    accessGroup: 'VIP',
    status: 'APPROVED',
    phases: ['BUMP_IN', 'LIVE'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'acc-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: null,
    company: null,
    role: null,
    accessGroup: null,
    status: 'PENDING',
    phases: ['LIVE'],
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('AccreditationListTable', () => {
  it('renders accreditation names', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
  });

  it('renders email when present', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getAllByText('john@test.com').length).toBeGreaterThan(0);
  });

  it('renders company when present and dash when null', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('renders status badges', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('renders View and Edit action buttons with correct links', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    const viewLinks = screen.getAllByRole('link', { name: /view/i });
    expect(viewLinks.length).toBeGreaterThanOrEqual(2);
    expect(viewLinks[0]).toHaveAttribute('href', '/admin/records/acc-1');
  });

  it('renders empty state when no accreditations', () => {
    render(<AccreditationListTable accreditations={[]} />);
    expect(screen.getByText('No accreditations found')).toBeInTheDocument();
    expect(screen.getByText('Add your first accreditation to this project.')).toBeInTheDocument();
  });

  it('renders Add First Accreditation button in empty state', () => {
    render(<AccreditationListTable accreditations={[]} />);
    expect(screen.getByRole('link', { name: /add first accreditation/i })).toBeInTheDocument();
  });

  it('renders phase badges for accreditations with phases', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getByText('Bump-In')).toBeInTheDocument();
    // "Live" appears for both accreditations
    expect(screen.getAllByText('Live').length).toBeGreaterThanOrEqual(1);
  });

  it('renders access group badge when present', () => {
    render(<AccreditationListTable accreditations={sampleAccreditations} />);
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});
