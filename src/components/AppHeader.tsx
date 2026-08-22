import type { ReactNode } from 'react';

export function AppHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="app-header">
      <div className="header-side">
        {onBack && <button className="icon-button" onClick={onBack} aria-label="Back">←</button>}
      </div>
      <h1>{title}</h1>
      <div className="header-side right">{right}</div>
    </header>
  );
}
