import type { EngineMode } from '../types';

export function EngineSelector({ value, onChange }: { value: EngineMode; onChange: (value: EngineMode) => void }) {
  return (
    <div className="segmented" aria-label="Engine selector">
      <button className={value === 'full' ? 'active' : ''} onClick={() => onChange('full')}>
        <strong>Full NNUE</strong><small>Default · strongest</small>
      </button>
      <button className={value === 'lite' ? 'active' : ''} onClick={() => onChange('lite')}>
        <strong>Lite</strong><small>Smaller · quicker load</small>
      </button>
    </div>
  );
}
