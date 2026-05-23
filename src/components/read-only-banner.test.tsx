// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { ReadOnlyBanner } from '@/components/read-only-banner';

const mockUseEventContext = vi.fn();

vi.mock('@/contexts/event-context', () => ({
  useEventContext: () => mockUseEventContext(),
}));

describe('ReadOnlyBanner', () => {
  beforeEach(() => {
    mockUseEventContext.mockReset();
  });

  it('renders nothing when isReadOnly is false', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: { id: '1', name: 'Test Event', status: 'ACTIVE' },
      isReadOnly: false,
    });
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when selectedProject is null', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: null,
      isReadOnly: true,
    });
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when both isReadOnly is false and selectedProject is null', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: null,
      isReadOnly: false,
    });
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows banner with project name and status when read-only with a selected project', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: { id: '2', name: 'Qatar Open 2025', status: 'COMPLETED' },
      isReadOnly: true,
    });
    render(<ReadOnlyBanner />);
    expect(screen.getByText('Qatar Open 2025')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByText('Viewing:')).toBeInTheDocument();
  });
});
