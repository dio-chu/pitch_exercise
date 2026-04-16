import { TRANSPOSE_OPTIONS } from '../utils/noteUtils';

const NOTE_LABEL_OPTIONS = [
  { value: 'western', label: 'ABCDEFG'  },
  { value: 'solfege', label: 'Do Re Mi' },
  { value: 'number',  label: '1234567'  },
];

export function SettingsDrawer({
  open, onToggle,
  labelType, setLabelType,
  transposeIndex, setTransposeIndex,
  isDesktop,
}) {
  return (
    <>
      {/* Toggle button — hidden on desktop when drawer is open (drawer header has close) */}
      {(!open || !isDesktop) && (
        <button
          className="drawer-toggle"
          onClick={onToggle}
          aria-label="Open settings"
        >
          <span className="drawer-toggle-icon">▶</span>
          <span className="drawer-toggle-text">Settings</span>
        </button>
      )}

      {/* Mobile backdrop */}
      {open && !isDesktop && (
        <div className="drawer-backdrop" onClick={onToggle} />
      )}

      <aside className={`settings-drawer${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <span>Settings</span>
          <button className="drawer-close" onClick={onToggle} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Note Labels:</div>
          {NOTE_LABEL_OPTIONS.map((opt) => (
            <label key={opt.value} className={`radio-row${labelType === opt.value ? ' selected' : ''}`}>
              <input
                type="radio"
                name="labelType"
                value={opt.value}
                checked={labelType === opt.value}
                onChange={() => setLabelType(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Transpose:</div>
          <div className="transpose-list">
            {TRANSPOSE_OPTIONS.map((opt, i) => (
              <label key={i} className={`radio-row${transposeIndex === i ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="transpose"
                  value={i}
                  checked={transposeIndex === i}
                  onChange={() => setTransposeIndex(i)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
