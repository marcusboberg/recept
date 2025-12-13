'use client';

interface Props {
  tags: string[];
  active: string[];
  onToggle: (tag: string) => void;
}

export function TagFilter({ tags, active, onToggle }: Props) {
  const uniqueTags = Array.from(new Set(tags)).sort();
  return (
    <div className="list-inline">
      {uniqueTags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`chip-button ${active.includes(tag) ? 'active' : ''}`}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
