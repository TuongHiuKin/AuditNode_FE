import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import apiClient from '../../shared/api/client';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import { useCatalogAccess } from '../../shared/catalog/CatalogAccessContext';
import type { CatalogPage } from '../../shared/catalog/types';

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
  placeholder = "Search servers & apps...",
  className,
  inputClassName,
}) => {
  const catalog = useCatalogAccess();
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setDebouncedKeyword('');
    setResults([]);
    setIsLoading(false);
    setIsOpen(false);
    onChangeRef.current('');
  }, [catalog.filters.labelKey, catalog.filters.labelValue, catalog.filters.ownerUserId, catalog.principalId, catalog.view]);

  // 1. Debounce logic (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  // 2. API Integration
  useEffect(() => {
    const controller = new AbortController();
    const searchKeyword = debouncedKeyword;

    if (!searchKeyword.trim()) {
      setResults([]);
      setIsOpen(false);
      return () => controller.abort();
    }

    setIsLoading(true);
    async function fetchResults() {
      try {
        const response = await apiClient.get<CatalogPage<SearchResult> | SearchResult[]>(`/api/v1/search`, {
          params: {
            q: searchKeyword,
            view: catalog.view,
            limit: 25,
            ownerUserId: catalog.filters.ownerUserId || undefined,
            labelKey: catalog.filters.labelKey || undefined,
            labelValue: catalog.filters.labelValue || undefined,
          },
          signal: controller.signal,
          skipWorkspaceHeader: true,
          catalogRequest: true,
          catalogView: catalog.view,
        });
        if (controller.signal.aborted) return;
        const items = Array.isArray(response.data) ? response.data : response.data.items;
        setResults(items);
        setIsOpen(items.length > 0);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Search API error:', error);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    void fetchResults();
    return () => controller.abort();
  }, [catalog.filters.labelKey, catalog.filters.labelValue, catalog.filters.ownerUserId, catalog.view, debouncedKeyword]);

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
    onChange(result.title); // Set search input to the clicked item's name
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
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
            "block w-full pl-9 pr-3 py-2 border border-border bg-background text-sm text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all",
            inputClassName
          )}
          placeholder={placeholder}
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface text-foreground rounded-md shadow-2xl border border-border max-h-64 overflow-y-auto" style={{ animation: "exportModalIn 0.1s ease-out both" }}>
          <ul className="py-1 list-none m-0">
            {results.map((result) => (
              <li
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="px-4 py-2 hover:bg-surface-hover cursor-pointer transition-colors border-b last:border-0 border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate pr-2 text-foreground">{result.title}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 uppercase font-bold border font-label',
                      result.type === 'SERVER'
                        ? 'border-primary/30 text-primary bg-primary/10'
                        : 'border-success/30 text-success bg-success/10'
                    )}
                  >
                    {result.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                <div className="text-[10px] italic text-muted-foreground/70 mt-1">
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
