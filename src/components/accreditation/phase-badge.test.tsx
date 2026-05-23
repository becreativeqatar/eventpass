// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { PhaseBadge, PhaseBadges } from '@/components/accreditation/phase-badge';
import type { AccreditationPhase } from '@/lib/validations/accreditation';

describe('PhaseBadge', () => {
  it('renders BUMP_IN with correct label', () => {
    render(<PhaseBadge phase="BUMP_IN" />);
    expect(screen.getByText('Bump-In')).toBeInTheDocument();
  });

  it('renders LIVE with correct label', () => {
    render(<PhaseBadge phase="LIVE" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders BUMP_OUT with correct label', () => {
    render(<PhaseBadge phase="BUMP_OUT" />);
    expect(screen.getByText('Bump-Out')).toBeInTheDocument();
  });

  it('renders unknown phase with raw text as fallback', () => {
    render(<PhaseBadge phase={'SETUP' as AccreditationPhase} />);
    expect(screen.getByText('SETUP')).toBeInTheDocument();
  });

  it('applies smaller icon and text when size is sm', () => {
    const { container } = render(<PhaseBadge phase="LIVE" size="sm" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('px-1.5');
  });

  it('does not apply sm-specific spacing classes at default size', () => {
    const { container } = render(<PhaseBadge phase="LIVE" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).not.toContain('px-1.5');
    // Default size uses h-3 w-3 for the icon, not h-2.5 w-2.5
    const icon = badge.querySelector('svg') as SVGElement;
    expect(icon.classList.contains('h-3')).toBe(true);
    expect(icon.classList.contains('w-3')).toBe(true);
  });
});

describe('PhaseBadges', () => {
  it('renders a badge for each phase', () => {
    const phases: AccreditationPhase[] = ['BUMP_IN', 'LIVE', 'BUMP_OUT'];
    render(<PhaseBadges phases={phases} />);
    expect(screen.getByText('Bump-In')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Bump-Out')).toBeInTheDocument();
  });

  it('renders nothing when phases array is empty', () => {
    const { container } = render(<PhaseBadges phases={[]} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.children).toHaveLength(0);
  });
});
