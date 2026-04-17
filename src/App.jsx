import { useState, useEffect } from "react";
import { PitchDisplay } from "./components/PitchDisplay";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { usePitchDetector } from "./hooks/usePitchDetector";
import { TRANSPOSE_OPTIONS, getTransposeLabel } from "./utils/noteUtils";
import { useT } from "./utils/i18n";
import MusicGame from "./components/MusicGame";

const DESKTOP_BP = 768; // px

// ── Simple hash router ────────────────────────────────────────────────────
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return hash;
}

// ── Router ───────────────────────────────────────────────────────────────
export default function App() {
  const hash = useHash();
  return hash === "#/game" ? <MusicGame /> : <PitchTrainer />;
}

// ── Main trainer page ────────────────────────────────────────────────────
function PitchTrainer() {
  const [labelType, setLabelType] = useState("western");
  const [transposeIndex, setTransposeIndex] = useState(0);
  const [detecting, setDetecting] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [theme, setTheme] = useState("default");
  const [lang, setLang] = useState("zh");
  const t = useT(lang);

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
        setDrawerOpen(true);
      else setDrawerOpen(false);
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
          <h1>{t.appTitle}</h1>
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
              <span className="badge-freq" style={{ fontSize: 13 }}>
                {t.paused}
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
        lang={lang}
        setLang={setLang}
        t={t}
      />

      {/* ── Fix / Detect button ── */}
      <button
        className={`fix-button ${detecting ? "detecting" : "paused"}`}
        onClick={() => setDetecting((v) => !v)}
      >
        {detecting ? (
          <>
            <span className="btn-dot" /> {t.fix}
          </>
        ) : (
          <>▶ {t.detect}</>
        )}
      </button>

      {/* ── Mic error toast ── */}
      {micError && <div className="mic-error">🎤 {micError}</div>}

      {/* ── FAB: go to Game ── */}
      <a
        href="#/game"
        title="Pitch Blaster"
        style={{
          position: "fixed",
          bottom: 20,
          right: 130,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#0d0d24",
          border: "2px solid #33ffaa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          color: "#33ffaa",
          boxShadow: "0 0 14px #33ffaa33",
          zIndex: 200,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 4H7C4.24 4 2 6.24 2 9v6c0 2.76 2.24 5 5 5 1.33 0 2.53-.52 3.43-1.37L12 17l1.57 1.63A4.97 4.97 0 0 0 17 20c2.76 0 5-2.24 5-5V9c0-2.76-2.24-5-5-5zm-7 9H8v2H6v-2H4v-2h2V9h2v2h2v2zm4.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
        </svg>
      </a>
    </div>
  );
}
