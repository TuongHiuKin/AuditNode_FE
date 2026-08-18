import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UniversalSearch from '../app/components/UniversalSearch';
import apiClient from '../shared/api/client';
import { setSelectedWorkspaceId } from '../shared/workspace/workspaceStore';

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
      placeholder="Search servers & apps..."
    />
  );
};

describe('UniversalSearch Component', () => {
  const workspaceA = '11111111-1111-4111-8111-111111111111';
  const workspaceB = '22222222-2222-4222-8222-222222222222';
  const mockOnSelectResult = vi.fn();

  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    setSelectedWorkspaceId(workspaceA, { persist: false });
  });

  it('renders the search input', () => {
    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    expect(screen.getByPlaceholderText(/search servers & apps/i)).toBeDefined();
  });

  it('triggers API call after debounce delay', async () => {
    const mockResults = [
      { id: '1', type: 'SERVER', title: 'Server Alpha', subtitle: '192.168.1.1', matchReason: 'IP match' }
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockResults });

    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    const input = screen.getByPlaceholderText(/search servers & apps/i);

    fireEvent.change(input, { target: { value: 'alpha' } });

    // Should not call immediately
    expect(apiClient.get).not.toHaveBeenCalled();

    // Wait for debounce (500ms)
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/search', {
        params: { keyword: 'alpha' },
        signal: expect.any(AbortSignal),
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
    const input = screen.getByPlaceholderText(/search servers & apps/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'payment' } });

    await waitFor(() => {
      expect(screen.getByText('Payment Gateway')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Payment Gateway'));

    expect(mockOnSelectResult).toHaveBeenCalledWith('app-1', 'APP');
    expect(input.value).toBe('Payment Gateway');
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

    const input = screen.getByPlaceholderText(/search servers & apps/i);
    fireEvent.change(input, { target: { value: 'res' } });

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeDefined();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Result')).toBeNull();
    });
  });

  it('clears search and ignores a late result from the previous workspace', async () => {
    let resolveA!: (value: { data: SearchResultFixture[] }) => void;
    let resolveB!: (value: { data: SearchResultFixture[] }) => void;
    type SearchResultFixture = {
      id: string;
      type: 'SERVER';
      title: string;
      subtitle: string;
      matchReason: string;
    };
    const requestA = new Promise<{ data: SearchResultFixture[] }>((resolve) => { resolveA = resolve; });
    const requestB = new Promise<{ data: SearchResultFixture[] }>((resolve) => { resolveB = resolve; });
    vi.mocked(apiClient.get).mockImplementation((_url, config) => {
      const keyword = config?.params?.keyword;
      if (keyword === 'alpha') return requestA;
      if (keyword === 'beta') return requestB;
      return Promise.resolve({ data: [] });
    });
    render(<UniversalSearchWrapper onSelectResult={mockOnSelectResult} />);
    const input = screen.getByPlaceholderText(/search servers & apps/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'alpha' } });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1), { timeout: 1000 });

    act(() => { setSelectedWorkspaceId(workspaceB, { persist: false }); });
    await waitFor(() => expect(input.value).toBe(''));
    fireEvent.change(input, { target: { value: 'beta' } });
    await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls.some(([, config]) => config?.params?.keyword === 'beta')).toBe(true), { timeout: 1000 });
    await act(async () => {
      resolveB({ data: [{ id: 'b', type: 'SERVER', title: 'Workspace B', subtitle: '', matchReason: '' }] });
    });
    await waitFor(() => expect(screen.getByText('Workspace B')).toBeDefined());
    await act(async () => {
      resolveA({ data: [{ id: 'a', type: 'SERVER', title: 'Workspace A', subtitle: '', matchReason: '' }] });
    });

    expect(screen.queryByText('Workspace A')).toBeNull();
    expect(screen.getByText('Workspace B')).toBeDefined();
    expect(vi.mocked(apiClient.get).mock.calls.every(([, config]) => config?.signal instanceof AbortSignal)).toBe(true);
  });
});
