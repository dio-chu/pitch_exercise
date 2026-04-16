import { useState, useEffect } from "react";
import { PitchDisplay } from "./components/PitchDisplay";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { usePitchDetector } from "./hooks/usePitchDetector";
import { TRANSPOSE_OPTIONS, getTransposeLabel } from "./utils/noteUtils";

const DESKTOP_BP = 768; // px

export default function App() {
  const [labelType, setLabelType] = useState("western");
  const [transposeIndex, setTransposeIndex] = useState(0);
  const [detecting, setDetecting] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [theme, setTheme] = useState("default");

  // ── RWD: drawer state ──
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BP,
  );
  const [drawerOpen, setDrawerOpen] = useState(
    () => window.innerWidth >= DESKTOP_BP,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BP}px)`);
    const handler = (e) => {
      setIsDesktop(e.matches);
      if (e.matches)
        setDrawerOpen(true); // auto-open on widen
      else setDrawerOpen(false); // auto-close on narrow
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { pitchInfo, micError } = usePitchDetector(detecting);

  const absC = Math.abs(pitchInfo?.cents ?? 0);
  const cColor = absC < 12 ? "#00e87a" : absC < 28 ? "#ffe44d" : "#ff4d6d";

  const contentShift = drawerOpen && isDesktop;

  return (
    <div className="app" data-theme={theme}>
      {/* ── Header ── */}
      <header
        className="app-header"
        style={{ paddingLeft: contentShift ? 220 + 20 : undefined }}
      >
        <div>
          <h1>Pitch Trainer</h1>
          <div className="header-subtitle">
            {getTransposeLabel(
              TRANSPOSE_OPTIONS[transposeIndex].semitone,
              labelType,
            )}
          </div>
        </div>
        <div className="pitch-badge">
          {pitchInfo ? (
            <>
              <span className="badge-freq">{pitchInfo.freq.toFixed(1)} Hz</span>
              <span className="badge-cents" style={{ color: cColor }}>
                {pitchInfo.cents > 0 ? "+" : ""}
                {pitchInfo.cents.toFixed(0)} ¢
              </span>
            </>
          ) : (
            !detecting && (
              <span
                className="badge-freq"
                style={{ fontSize: 13 }}
              >
                Paused
              </span>
            )
          )}
        </div>
      </header>

      {/* ── Main area ── */}
      <div
        className="main-area"
        style={{
          marginLeft: contentShift ? 220 : 0,
          transition: "margin-left .25s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <PitchDisplay
          labelType={labelType}
          transposeIndex={transposeIndex}
          pitchInfo={detecting ? pitchInfo : null}
          active={detecting}
          autoScroll={autoScroll}
          theme={theme}
          onToggle={() => setDetecting((v) => !v)}
        />
      </div>

      {/* ── Settings drawer ── */}
      <SettingsDrawer
        open={drawerOpen}
        onToggle={() => setDrawerOpen((v) => !v)}
        isDesktop={isDesktop}
        labelType={labelType}
        setLabelType={setLabelType}
        transposeIndex={transposeIndex}
        setTransposeIndex={setTransposeIndex}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        theme={theme}
        setTheme={setTheme}
      />

      {/* ── Fix / Detect button ── */}
      <button
        className={`fix-button ${detecting ? "detecting" : "paused"}`}
        onClick={() => setDetecting((v) => !v)}
      >
        {detecting ? (
          <>
            <span className="btn-dot" /> Fix
          </>
        ) : (
          <>▶ Detect</>
        )}
      </button>

      {/* ── Mic error toast ── */}
      {micError && <div className="mic-error">🎤 {micError}</div>}
    </div>
  );
}
