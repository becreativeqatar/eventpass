'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bahrain', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'China', 'Colombia',
  'Czech Republic', 'Denmark', 'Egypt', 'Ethiopia', 'Finland', 'France',
  'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Italy', 'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Lebanon',
  'Malaysia', 'Mexico', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan',
  'Sweden', 'Switzerland', 'Syria', 'Thailand', 'Tunisia', 'Turkey', 'UAE',
  'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Vietnam', 'Yemen',
];

interface CountryInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

export function CountryInput({ value, onChange, id, className }: CountryInputProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = value.length >= 1
    ? COUNTRIES.filter(c => c.toLowerCase().includes(value.toLowerCase()))
    : [];

  const showDropdown = focused && filtered.length > 0 && value.length >= 1;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        placeholder="Type to search..."
        autoComplete="off"
        className={className}
      />
      {showDropdown && open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.slice(0, 8).map((country) => (
            <button
              key={country}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                country === value && 'bg-accent font-medium'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(country);
                setOpen(false);
              }}
            >
              {country}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
