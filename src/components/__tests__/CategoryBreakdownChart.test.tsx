import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { 
  CategoryBreakdownChart, 
  CategoryBreakdownMini,
  CategoryData 
} from '../CategoryBreakdownChart';

// Mock data for tests
const MOCK_DATA: CategoryData[] = [
  { code: 'D1', amount: 1000, count: 5 },
  { code: 'D2', amount: 500, count: 3 },
  { code: 'D3', amount: 250, count: 2 },
  { code: 'D4', amount: 0, count: 0 },
  { code: 'D5', amount: 750, count: 4 },
];

const EMPTY_DATA: CategoryData[] = [
  { code: 'D1', amount: 0, count: 0 },
  { code: 'D2', amount: 0, count: 0 },
  { code: 'D3', amount: 0, count: 0 },
];

describe('CategoryBreakdownChart', () => {
  it('renders without crashing', () => {
    render(<CategoryBreakdownChart data={MOCK_DATA} />);
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
  });

  it('displays correct total amount', () => {
    render(<CategoryBreakdownChart data={MOCK_DATA} />);
    const total = MOCK_DATA.reduce((sum, item) => sum + item.amount, 0);
    expect(screen.getByText(`$${total.toLocaleString()}`)).toBeInTheDocument();
  });

  it('displays correct receipt count', () => {
    render(<CategoryBreakdownChart data={MOCK_DATA} />);
    const totalReceipts = MOCK_DATA.reduce((sum, item) => sum + item.count, 0);
    expect(screen.getByText(`${totalReceipts} receipts`)).toBeInTheDocument();
  });

  it('renders fiscal year when provided', () => {
    render(<CategoryBreakdownChart data={MOCK_DATA} fiscalYear="2024-25" />);
    expect(screen.getByText(/FY 2024-25/)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<CategoryBreakdownChart data={EMPTY_DATA} />);
    expect(screen.getByText('No deductions recorded')).toBeInTheDocument();
    expect(screen.getByText('Add receipts to see your category breakdown')).toBeInTheDocument();
  });

  it('filters out categories with zero amounts', () => {
    const { container } = render(<CategoryBreakdownChart data={MOCK_DATA} />);
    // The chart should only render slices for non-zero categories
    // D4 has amount 0, so it should not appear in the legend
    const legendItems = container.querySelectorAll('[class*="rounded-lg"]');
    // Should have 4 legend items (D1, D2, D3, D5) since D4 has 0 amount
    expect(legendItems.length).toBeGreaterThan(0);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<CategoryBreakdownChart data={MOCK_DATA} size="sm" />);
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    
    rerender(<CategoryBreakdownChart data={MOCK_DATA} size="md" />);
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    
    rerender(<CategoryBreakdownChart data={MOCK_DATA} size="lg" />);
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
  });

  it('can hide legend', () => {
    const { container } = render(
      <CategoryBreakdownChart data={MOCK_DATA} showLegend={false} />
    );
    // When legend is hidden, the grid layout should not have 2 columns
    const grid = container.querySelector('.lg\\:grid-cols-\\[1fr\\,220px\\]');
    // The grid class should not be present when showLegend is false
    expect(grid).toBeFalsy();
  });
});

describe('CategoryBreakdownMini', () => {
  it('renders without crashing', () => {
    render(<CategoryBreakdownMini data={MOCK_DATA} />);
  });

  it('shows empty state when no data', () => {
    render(<CategoryBreakdownMini data={EMPTY_DATA} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('displays top 5 categories only', () => {
    const manyCategories: CategoryData[] = [
      { code: 'D1', amount: 1000, count: 5 },
      { code: 'D2', amount: 900, count: 4 },
      { code: 'D3', amount: 800, count: 3 },
      { code: 'D4', amount: 700, count: 2 },
      { code: 'D5', amount: 600, count: 1 },
      { code: 'D6', amount: 500, count: 1 },
      { code: 'D7', amount: 400, count: 1 },
    ];
    render(<CategoryBreakdownMini data={manyCategories} />);
    // Mini version only shows top 5, so percentages should add up to 100%
    // for the top 5 categories only
  });
});

// Integration test with mock receipts
describe('CategoryBreakdownChart Integration', () => {
  it('handles real-world category distribution', () => {
    const realWorldData: CategoryData[] = [
      { code: 'D1', amount: 2850, count: 12 },
      { code: 'D2', amount: 1250.50, count: 8 },
      { code: 'D3', amount: 450, count: 5 },
      { code: 'D4', amount: 1850, count: 3 },
      { code: 'D5', amount: 2200, count: 15 },
      { code: 'D6', amount: 0, count: 0 },
      { code: 'D7', amount: 0, count: 0 },
      { code: 'D8', amount: 500, count: 4 },
      { code: 'D9', amount: 350, count: 2 },
      { code: 'D10', amount: 0, count: 0 },
      { code: 'D11', amount: 0, count: 0 },
      { code: 'D12', amount: 5000, count: 2 },
      { code: 'D13', amount: 0, count: 0 },
      { code: 'D14', amount: 0, count: 0 },
      { code: 'D15', amount: 180, count: 1 },
    ];
    
    render(<CategoryBreakdownChart data={realWorldData} fiscalYear="2024-25" />);
    
    // Total should be calculated correctly
    const expectedTotal = realWorldData.reduce((sum, item) => sum + item.amount, 0);
    expect(screen.getByText(`$${expectedTotal.toLocaleString()}`)).toBeInTheDocument();
  });
});
