// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { AccreditationStatusBadge } from '@/components/accreditation/status-badge';

describe('AccreditationStatusBadge', () => {
  it('renders PENDING with correct label', () => {
    render(<AccreditationStatusBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders APPROVED with correct label', () => {
    render(<AccreditationStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders REJECTED with correct label', () => {
    render(<AccreditationStatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders REVOKED with correct label', () => {
    render(<AccreditationStatusBadge status="REVOKED" />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('renders EXPIRED with correct label', () => {
    render(<AccreditationStatusBadge status="EXPIRED" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders DRAFT status as unknown fallback using raw status text', () => {
    render(<AccreditationStatusBadge status="DRAFT" />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders unknown status as fallback with raw status text', () => {
    render(<AccreditationStatusBadge status="SOMETHING_ELSE" />);
    expect(screen.getByText('SOMETHING_ELSE')).toBeInTheDocument();
  });
});
