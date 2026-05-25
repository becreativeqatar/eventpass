// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from '@/components/data-table';

interface TestRow {
  id: string;
  name: string;
  email: string;
}

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'email', header: 'Email', render: (row) => row.email },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
];

function renderTable(overrides: Partial<Parameters<typeof DataTable<TestRow>>[0]> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={sampleData}
      keyExtractor={(row) => row.id}
      {...overrides}
    />,
  );
}

describe('DataTable', () => {
  it('renders column headers and row data', () => {
    renderTable();
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('bob@test.com').length).toBeGreaterThan(0);
  });

  it('renders all rows', () => {
    renderTable();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('renders empty state when data is empty', () => {
    renderTable({ data: [] });
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders custom empty state title and description', () => {
    renderTable({
      data: [],
      emptyTitle: 'No records',
      emptyDescription: 'Try adjusting your filters',
    });
    expect(screen.getByText('No records')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = renderTable({ loading: true });
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not render data rows when loading', () => {
    renderTable({ loading: true });
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders pagination info when pagination is provided', () => {
    renderTable({
      pagination: {
        page: 1,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    expect(screen.getByText(/1–10 of 25/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    renderTable({
      pagination: {
        page: 1,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderTable({
      pagination: {
        page: 3,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange with next page when next button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable({
      pagination: {
        page: 1,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange,
      },
    });
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with previous page when previous button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable({
      pagination: {
        page: 2,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange,
      },
    });
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    await user.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('does not render pagination when there is only one page', () => {
    renderTable({
      pagination: {
        page: 1,
        pages: 1,
        total: 2,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows correct page info for middle pages', () => {
    renderTable({
      pagination: {
        page: 2,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    expect(screen.getByText(/11–20 of 25/)).toBeInTheDocument();
  });

  it('shows correct page info for last page with partial results', () => {
    renderTable({
      pagination: {
        page: 3,
        pages: 3,
        total: 25,
        limit: 10,
        onPageChange: vi.fn(),
      },
    });
    expect(screen.getByText(/21–25 of 25/)).toBeInTheDocument();
  });

  it('renders empty action element in empty state', () => {
    renderTable({
      data: [],
      emptyAction: <button>Add New</button>,
    });
    expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
  });
});
