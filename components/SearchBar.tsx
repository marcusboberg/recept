'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search title, description or tags',
  className,
  inputClassName,
  id,
}: Props) {
  return (
    <input
      id={id}
      className={`input ${inputClassName ?? ''} ${className ?? ''}`.trim()}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
