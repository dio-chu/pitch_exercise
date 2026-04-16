import { TRANSPOSE_OPTIONS, getTransposeLabel } from "../utils/noteUtils";

const NOTE_LABEL_OPTIONS = [
  { value: "western", label: "ABCDEFG" },
  { value: "solfege", label: "Do Re Mi" },
  { value: "number", label: "1234567" },
];

// Compact key names for transpose grid (flat notation for black keys)
const KEY_LABELS = [
  "C",
  "B",
  "B♭",
  "A",
  "A♭",
  "G",
  "G♭",
  "F",
  "E",
  "E♭",
  "D",
  "D♭",
];

const THEME_OPTIONS = [
  { value: "default", label: "Default", color: "#e8189e" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "dark", label: "Dark", color: "#6b7280" },
];

export function SettingsDrawer({
  open,
  onToggle,
  labelType,
  setLabelType,
  transposeIndex,
  setTransposeIndex,
  autoScroll,
  setAutoScroll,
  theme,
  setTheme,
  isDesktop,
}) {
  return (
    <>
      {/* Toggle button */}
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

      <aside className={`settings-drawer${open ? " open" : ""}`}>
        <div className="drawer-header">
          <span>Settings</span>
          <button
            className="drawer-close"
            onClick={onToggle}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Auto-scroll */}
        <div className="drawer-section">
          <div className="drawer-section-title">Auto-Scroll:</div>
          <label className={`radio-row${autoScroll ? " selected" : ""}`}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Follow Pitch</span>
          </label>
        </div>

        {/* Note Labels */}
        <div className="drawer-section">
          <div className="drawer-section-title">Note Labels:</div>
          {NOTE_LABEL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`radio-row${labelType === opt.value ? " selected" : ""}`}
            >
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

        {/* Transpose — inline 2-column grid */}
        <div className="drawer-section">
          <div className="transpose-inline">
            <div className="drawer-section-title">
              {
                getTransposeLabel(
                  TRANSPOSE_OPTIONS[transposeIndex].semitone,
                  labelType,
                ).split(" = ")[0]
              }{" "}
              =
            </div>
            <div className="transpose-grid">
              {TRANSPOSE_OPTIONS.map((opt, i) => (
                <label
                  key={i}
                  className={`transpose-cell${transposeIndex === i ? " selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="transpose"
                    value={i}
                    checked={transposeIndex === i}
                    onChange={() => setTransposeIndex(i)}
                  />
                  <span>{KEY_LABELS[i]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="drawer-section">
          <div className="drawer-section-title">Theme:</div>
          {THEME_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`radio-row${theme === opt.value ? " selected" : ""}`}
            >
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={theme === opt.value}
                onChange={() => setTheme(opt.value)}
              />
              <span className="theme-dot" style={{ background: opt.color }} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </aside>
    </>
  );
}
