import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UniversalSearch from '../app/components/UniversalSearch';
import apiClient from '../shared/api/client';

// Mock the apiClient
vi.mock('../shared/api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Wrapper to manage state for controlled component
const UniversalSearchWrapper = ({ onSelectResult }: any) => {
  const [value, setValue] = useState('');
  return (
    <UniversalSearch 
      value={value} 
      onChange={setValue} 
      onSelectResult={onSelectResult} 
      placeholder="Search Server/App..."
    />
  );
};

describe('UniversalSearch Component', () => {
  const mockOnSelectResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search input', () => {
    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    expect(screen.getByPlaceholderText(/search server\/app/i)).toBeDefined();
  });

  it('triggers API call after debounce delay', async () => {
    const mockResults = [
      { id: '1', type: 'SERVER', title: 'Server Alpha', subtitle: '192.168.1.1', matchReason: 'IP match' }
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockResults });

    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    const input = screen.getByPlaceholderText(/search server\/app/i);

    fireEvent.change(input, { target: { value: 'alpha' } });

    // Should not call immediately
    expect(apiClient.get).not.toHaveBeenCalled();

    // Wait for debounce (500ms)
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/search', {
        params: { keyword: 'alpha' },
      });
    }, { timeout: 1000 });

    // Check if dropdown is visible
    expect(screen.getByText('Server Alpha')).toBeDefined();
    expect(screen.getByText('SERVER')).toBeDefined();
  });

  it('calls onSelectResult and clears input when a result is clicked', async () => {
    const mockResults = [
      { id: 'app-1', type: 'APP', title: 'Payment Gateway', subtitle: 'Critical', matchReason: 'Title match' }
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockResults });

    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    const input = screen.getByPlaceholderText(/search server\/app/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'payment' } });

    await waitFor(() => {
      expect(screen.getByText('Payment Gateway')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Payment Gateway'));

    expect(mockOnSelectResult).toHaveBeenCalledWith('app-1', 'APP');
    expect(input.value).toBe('');
    expect(screen.queryByText('Payment Gateway')).toBeNull();
  });

  it('closes dropdown when clicking outside', async () => {
    const mockResults = [
      { id: '1', type: 'SERVER', title: 'Result', subtitle: 'sub', matchReason: 'reason' }
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockResults });

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <UniversalSearchWrapper onSelectResult={mockOnSelectResult} />
      </div>
    );

    const input = screen.getByPlaceholderText(/search server\/app/i);
    fireEvent.change(input, { target: { value: 'res' } });

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeDefined();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Result')).toBeNull();
    });
  });
});
