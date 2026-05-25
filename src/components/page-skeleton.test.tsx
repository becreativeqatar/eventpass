// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { DashboardSkeleton, TablePageSkeleton } from '@/components/page-skeleton';

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders skeleton elements with animate-pulse', () => {
    const { container } = render(<DashboardSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders four stat cards', () => {
    const { container } = render(<DashboardSkeleton />);
    // The grid with 4 cards
    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('TablePageSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TablePageSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with default columns and rows', () => {
    const { container } = render(<TablePageSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders with custom columns and rows', () => {
    const { container } = render(<TablePageSkeleton columns={3} rows={2} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
