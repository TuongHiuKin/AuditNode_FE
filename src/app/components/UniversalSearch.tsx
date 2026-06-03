import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import apiClient from '../../shared/api/client';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

export type SearchResultType = 'SERVER' | 'APP';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  matchReason: string;
}

interface UniversalSearchProps {
  onSelectResult: (id: string, type: SearchResultType) => void;
  className?: string;
}

/**
 * Universal Search Component with Debounce and Autocomplete.
 * Implementation follows FSD-Lite standards and Tailwind CSS.
 */
const UniversalSearch: React.FC<UniversalSearchProps> = ({ onSelectResult, className }) => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Debounce logic (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  // 2. API Integration
  const fetchResults = useCallback(async (searchKeyword: string) => {
    if (!searchKeyword.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get<SearchResult[]>(`/api/search`, {
        params: { keyword: searchKeyword },
      });
      setResults(response.data);
      setIsOpen(response.data.length > 0);
    } catch (error) {
      console.error('Search API error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedKeyword);
  }, [debouncedKeyword, fetchResults]);

  // 3. Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result.id, result.type);
    setKeyword('');
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full max-w-md', className)} ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          )}
        </div>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => keyword.trim() && results.length > 0 && setIsOpen(true)}
          className="block w-full pl-10 pr-3 py-2 border border-input bg-background rounded-md leading-5 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm transition-all shadow-sm"
          placeholder="Search servers or apps..."
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md shadow-lg border border-border max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <ul className="py-1 list-none m-0">
            {results.map((result) => (
              <li
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-b last:border-0 border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate pr-2">{result.title}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 uppercase font-bold',
                      result.type === 'SERVER'
                        ? 'border-blue-500 text-blue-500 bg-blue-50'
                        : 'border-green-500 text-green-500 bg-green-50'
                    )}
                  >
                    {result.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                <div className="text-[10px] italic text-muted-foreground/80 mt-1">
                  Matched by: {result.matchReason}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UniversalSearch;
