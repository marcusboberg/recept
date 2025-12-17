import type { ReactNode } from 'react';

type NavChild = {
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
};

type NavSection = {
  id: string;
  label: string;
  iconClass: string;
  children: NavChild[];
};

interface Props {
  title: string;
  navSections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
  footer: ReactNode;
}

export function StudioSidebar({ title, navSections, activeId, onSelect, footer }: Props) {
  return (
    <aside className="new-recipe-shell__sidebar">
      <div className="new-recipe-brand">
        <div className="new-recipe-brand__logo">R</div>
        <div className="new-recipe-brand__copy">
          <p className="new-recipe-brand__name">Recept</p>
          <p className="new-recipe-brand__section">Studio</p>
        </div>
        <span className="new-recipe-brand__pill">v1.0</span>
      </div>
      <h1 className="new-recipe-title">{title}</h1>
      <nav className="new-recipe-nav">
        {navSections.map((section) => (
          <div key={section.id} className="new-recipe-nav__section">
            <div className="new-recipe-nav__parent">
              <span className="nav-icon-badge">
                <i className={`nav-icon ${section.iconClass}`} aria-hidden="true"></i>
              </span>
              <span className="nav-copy">
                <span className="nav-label">{section.label}</span>
              </span>
            </div>
            <div className="new-recipe-nav__children">
              {section.children.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.disabled && onSelect(item.id)}
                  className={activeId === item.id ? 'new-recipe-nav__child is-active' : 'new-recipe-nav__child'}
                  disabled={item.disabled}
                  title={item.disabled ? 'Inte tillgänglig i detta läge' : undefined}
                  style={item.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  <span>{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="new-recipe-footer">
        {footer}
      </div>
    </aside>
  );
}
