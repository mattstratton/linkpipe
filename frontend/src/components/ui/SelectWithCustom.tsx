import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectWithCustomProps {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SelectWithCustom({
  label,
  id,
  name,
  value,
  onChange,
  options,
  placeholder = '',
  disabled = false,
  className = '',
}: SelectWithCustomProps) {
  const [isCustom, setIsCustom] = useState(() => {
    return value !== '' && !options.includes(value);
  });

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === '__custom__') {
      setIsCustom(true);
      // Create a synthetic event for the text input
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name,
          value: '',
        },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    } else {
      setIsCustom(false);
      onChange(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };

  const handleBackToSelect = () => {
    setIsCustom(false);
    const syntheticEvent = {
      target: {
        name,
        value: '',
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {isCustom ? (
        <div className="space-y-2">
          <input
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={handleInputChange}
            placeholder={`Enter custom ${label.toLowerCase()}`}
            className="input"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleBackToSelect}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={disabled}
          >
            ← Choose from predefined options
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            id={id}
            name={name}
            value={value}
            onChange={handleSelectChange}
            className="input appearance-none pr-10"
            disabled={disabled}
          >
            <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="__custom__">✏️ Custom...</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      )}
    </div>
  );
}