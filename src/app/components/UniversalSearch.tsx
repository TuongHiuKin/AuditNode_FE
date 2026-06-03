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
  value: string;
  onChange: (value: string) => void;
  onSelectResult: (id: string, type: SearchResultType) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/**
 * Universal Search Component with Debounce and Autocomplete.
 * Implementation follows FSD-Lite standards and Tailwind CSS.
 */
const UniversalSearch: React.FC<UniversalSearchProps> = ({
  value,
  onChange,
  onSelectResult,
  placeholder = "Search Server/App...",
  className,
  inputClassName,
}) => {
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Debounce logic (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

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
    onChange(''); // Clear the search field after selection
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-tertiary transition-colors" />
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim()) {
              setIsOpen(true);
            }
          }}
          onFocus={() => value.trim() && results.length > 0 && setIsOpen(true)}
          className={cn(
            "block w-full pl-9 pr-3 py-2 border border-slate-800 bg-[#050811] text-sm text-primary placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-tertiary transition-all",
            inputClassName
          )}
          placeholder={placeholder}
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#0c1322] text-primary rounded-md shadow-2xl border border-slate-900 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <ul className="py-1 list-none m-0">
            {results.map((result) => (
              <li
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="px-4 py-2 hover:bg-[#161f38] cursor-pointer transition-colors border-b last:border-0 border-slate-900"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate pr-2 text-primary">{result.title}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 uppercase font-bold border',
                      result.type === 'SERVER'
                        ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                        : 'border-green-500/30 text-green-400 bg-green-500/10'
                    )}
                  >
                    {result.type}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 truncate">{result.subtitle}</div>
                <div className="text-[10px] italic text-slate-500 mt-1">
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
