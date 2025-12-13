'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      className="input"
      placeholder="Search title, description or tags"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
