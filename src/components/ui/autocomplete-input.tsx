'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  fetchUrl: string;
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  fetchUrl,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!value || value.length < 1) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${fetchUrl}?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.data as string[]).filter(
            (s) => s.toLowerCase() !== value.toLowerCase()
          );
          setSuggestions(filtered);
          setOpen(filtered.length > 0);
          setActiveIndex(-1);
        }
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [value, fetchUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-48 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => selectSuggestion(s)}
              className={cn(
                'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
