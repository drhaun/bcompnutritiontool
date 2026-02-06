'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | string;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  suffix?: string;
  prefix?: string;
}

/**
 * NumericInput - A better number input that:
 * - Allows backspace/delete to clear the field completely
 * - Shows empty state while typing (not forced to min)
 * - Validates and clamps on blur
 * - Supports keyboard increment/decrement with arrow keys
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ 
    className, 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    allowEmpty = false,
    suffix,
    prefix,
    disabled,
    ...props 
  }, ref) => {
    // Track internal string value to allow empty state while typing
    const [internalValue, setInternalValue] = React.useState<string>(
      value === undefined || value === '' ? '' : String(value)
    );
    
    // Sync internal value when external value changes (e.g., from form reset)
    React.useEffect(() => {
      setInternalValue(value === undefined || value === '' ? '' : String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Allow empty string (for typing)
      if (rawValue === '' || rawValue === '-') {
        setInternalValue(rawValue);
        if (allowEmpty) {
          onChange(undefined);
        }
        return;
      }
      
      // Allow typing decimal point
      if (rawValue.endsWith('.') || rawValue.endsWith(',')) {
        setInternalValue(rawValue);
        return;
      }
      
      // Parse and validate number
      const num = parseFloat(rawValue.replace(',', '.'));
      if (!isNaN(num)) {
        setInternalValue(rawValue);
        onChange(num);
      }
    };

    const handleBlur = () => {
      // On blur, validate and clamp the value
      if (internalValue === '' || internalValue === '-') {
        if (allowEmpty) {
          setInternalValue('');
          onChange(undefined);
        } else {
          // Default to min or 0
          const defaultVal = min !== undefined ? min : 0;
          setInternalValue(String(defaultVal));
          onChange(defaultVal);
        }
        return;
      }
      
      let num = parseFloat(internalValue.replace(',', '.'));
      if (isNaN(num)) {
        num = min !== undefined ? min : 0;
      }
      
      // Clamp to min/max
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      
      // Round to step precision
      if (step && step < 1) {
        const precision = String(step).split('.')[1]?.length || 0;
        num = parseFloat(num.toFixed(precision));
      } else {
        num = Math.round(num);
      }
      
      setInternalValue(String(num));
      onChange(num);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Arrow key increment/decrement
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentVal = parseFloat(internalValue) || (min ?? 0);
        const delta = e.key === 'ArrowUp' ? step : -step;
        let newVal = currentVal + delta;
        
        if (min !== undefined && newVal < min) newVal = min;
        if (max !== undefined && newVal > max) newVal = max;
        
        setInternalValue(String(newVal));
        onChange(newVal);
      }
    };

    return (
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            prefix && "pl-8",
            suffix && "pr-10",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

NumericInput.displayName = 'NumericInput';

export { NumericInput };
