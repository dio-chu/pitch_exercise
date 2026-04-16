import { useRef, useEffect } from "react";
import {
  generateNoteGrid,
  getNoteInfo,
  TRANSPOSE_OPTIONS,
  midiToFrequency,
} from "../utils/noteUtils";

const ROW_HEIGHT = 22; // px per semitone
const LABEL_W = 76; // px — each side label column
const TOP_MIDI = 96; // C7 = top of grid
const HISTORY_MS = 10000; // 10 s of pitch trail shown on canvas

const NOTE_GRID = generateNoteGrid();

export function PitchDisplay({
  labelType,
  transposeIndex,
  pitchInfo,
  active,
  onToggle,
}) {
  // Audio playback state
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Start playing a note
  const startNote = (midi) => {
    stopNote(); // Stop any existing note

    const freq = midiToFrequency(midi);
    console.log(`🎵 Playing: MIDI ${midi}, Frequency ${freq.toFixed(2)} Hz`);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    audioContextRef.current = audioCtx;
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
  };

  // Stop playing the current note
  const stopNote = () => {
    if (
      oscillatorRef.current &&
      gainNodeRef.current &&
      audioContextRef.current
    ) {
      const ctx = audioContextRef.current;
      gainNodeRef.current.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + 0.15,
      );
      oscillatorRef.current.stop(ctx.currentTime + 0.15);
      setTimeout(() => ctx.close(), 200);
    }
    oscillatorRef.current = null;
    gainNodeRef.current = null;
    audioContextRef.current = null;
  };

  // Play note for fixed duration (mobile/touch)
  const playNoteFixed = (midi, duration = 1.0) => {
    const freq = midiToFrequency(midi);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + duration,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);

    setTimeout(() => audioCtx.close(), (duration + 0.1) * 1000);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => stopNote();
  }, []);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const historyRef = useRef([]); // [{midiFloat, cents, time}]
  const pitchInfoRef = useRef(pitchInfo);
  const activeRef = useRef(active);

  // Keep refs up-to-date without triggering effect re-runs
  useEffect(() => {
    pitchInfoRef.current = pitchInfo;
  }, [pitchInfo]);
  useEffect(() => {
    activeRef.current = active;
    if (!active) historyRef.current = []; // clear trail when paused
  }, [active]);

  // ── Scroll to C4 on mount ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop =
      (TOP_MIDI - 60) * ROW_HEIGHT + ROW_HEIGHT / 2 - el.clientHeight / 2;
  }, []);

  // ── Auto-follow detected pitch ──
  const prevMidi = useRef(null);
  useEffect(() => {
    if (!pitchInfo || !containerRef.current) return;
    if (pitchInfo.midiRounded === prevMidi.current) return;
    prevMidi.current = pitchInfo.midiRounded;

    const el = containerRef.current;
    const y = (TOP_MIDI - pitchInfo.midiFloat) * ROW_HEIGHT + ROW_HEIGHT / 2;
    const pad = 100;
    if (y < el.scrollTop + pad || y > el.scrollTop + el.clientHeight - pad) {
      el.scrollTo({ top: y - el.clientHeight / 2, behavior: "smooth" });
    }
  }, [pitchInfo?.midiRounded]);

  // ── Canvas size ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !root) return;

    const resize = () => {
      const r = root.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width - LABEL_W * 2));
      canvas.height = Math.max(1, Math.round(r.height));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // ── Main draw loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollEl = containerRef.current;
    if (!canvas || !scrollEl) return;

    let rafId;

    const draw = () => {
      // ── Append new sample to history ──
      if (activeRef.current && pitchInfoRef.current) {
        historyRef.current.push({
          midiFloat: pitchInfoRef.current.midiFloat,
          cents: pitchInfoRef.current.cents,
          time: performance.now(),
        });
      } else if (activeRef.current) {
        // silence marker — break the line
        historyRef.current.push({ silent: true, time: performance.now() });
      }

      // Trim old entries
      const cutoff = performance.now() - HISTORY_MS;
      const hist = historyRef.current;
      let start = 0;
      while (start < hist.length && hist[start].time < cutoff) start++;
      if (start > 0) historyRef.current = hist.slice(start);

      // ── Draw ──
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const now = performance.now();
      const scrollTop = scrollEl.scrollTop;

      ctx.clearRect(0, 0, W, H);

      const history = historyRef.current;

      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Draw pitch history in blue
      ctx.strokeStyle = "#3b82f6"; // blue
      ctx.beginPath();
      let pathStarted = false;

      for (let i = 0; i < history.length; i++) {
        const pt = history[i];

        // Break on silence or long gap
        if (pt.silent || (i > 0 && pt.time - history[i - 1].time > 200)) {
          pathStarted = false;
          continue;
        }

        const x = W - ((now - pt.time) / HISTORY_MS) * W;
        const y =
          (TOP_MIDI - pt.midiFloat) * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;

        // Skip if out of bounds
        if (y < -4 || y > H + 4) {
          pathStarted = false;
          continue;
        }

        if (!pathStarted) {
          ctx.moveTo(x, y);
          pathStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw red horizontal indicator at current pitch
      if (activeRef.current && pitchInfoRef.current) {
        const currentY =
          (TOP_MIDI - pitchInfoRef.current.midiFloat) * ROW_HEIGHT +
          ROW_HEIGHT / 2 -
          scrollTop;
        if (currentY >= -4 && currentY <= H + 4) {
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, currentY);
          ctx.lineTo(W, currentY);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const transposeOffset = TRANSPOSE_OPTIONS[transposeIndex].semitone;
  const totalHeight = NOTE_GRID.length * ROW_HEIGHT + 100; // Add 100px bottom padding

  return (
    <div
      className="pitch-display-root"
      onClick={onToggle}
      style={{ cursor: "pointer" }}
    >
      {/* Scrollable note grid */}
      <div className="pitch-display-wrap" ref={containerRef}>
        <div className="pitch-display-inner" style={{ height: totalHeight }}>
          {NOTE_GRID.map(({ midi, semitone, octave }) => {
            const { label, isDiatonic, isC } = getNoteInfo(
              semitone,
              octave,
              labelType,
              transposeOffset,
            );
            const rowClass =
              "note-row " +
              (isC ? "row-c" : isDiatonic ? "row-diatonic" : "row-chromatic");

            const hasLabel = label !== null;

            const handleMouseDown = (e) => {
              e.stopPropagation();
              e.preventDefault();
              startNote(midi);
            };

            const handleMouseUp = (e) => {
              e.stopPropagation();
              e.preventDefault();
              stopNote();
            };

            const handleTouchStart = (e) => {
              e.stopPropagation();
              playNoteFixed(midi, 1.0);
            };

            const handleClick = (e) => {
              e.stopPropagation(); // Always prevent pause toggle
            };

            return (
              <div
                key={midi}
                className={rowClass}
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  className="nlabel nlabel-left"
                  style={{ width: LABEL_W, cursor: "pointer" }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onClick={handleClick}
                >
                  {label}
                </div>
                <div className="nline" />
                <div
                  className="nlabel nlabel-right"
                  style={{ width: LABEL_W, cursor: "pointer" }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onClick={handleClick}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas — absolutely positioned, does NOT scroll */}
      <canvas
        ref={canvasRef}
        className="pitch-canvas"
        style={{ left: LABEL_W, width: `calc(100% - ${LABEL_W * 2}px)` }}
      />

      {/* Paused overlay */}
      {!active && (
        <div className="pitch-paused-overlay">
          <div className="play-icon" />
        </div>
      )}
    </div>
  );
}
