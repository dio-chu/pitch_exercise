import { useEffect, useRef, useState, useCallback } from "react";
import { usePitchDetector } from "../hooks/usePitchDetector";

// ── Constants ───────────────────────────────────────────────────────────
const NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_ST = [0, 2, 4, 5, 7, 9, 11];
const CHR_NAME = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// semitone → fractional column index (C=0, D=1 … B=6; sharps at 0.5 steps)
const ST_FC = {
  0: 0,
  1: 0.5,
  2: 1,
  3: 1.5,
  4: 2,
  5: 3,
  6: 3.5,
  7: 4,
  8: 4.5,
  9: 5,
  10: 5.5,
  11: 6,
};

const COLS = 7;
const COL_W = 60;
const GAME_W = COLS * COL_W; // 420
const PITCH_W = 82; // right pitch-panel width
const CANVAS_W = GAME_W + PITCH_W; // 502
const GAME_H = 520;
const HUD_H = 34;
const LABEL_H = 26;
const PLAY_TOP = HUD_H + LABEL_H;
const CANNON_Y = GAME_H - 28;

// Block sizes – narrow so you need accurate pitch
const DBLK_W = 24; // diatonic
const DBLK_H = 22;
const CBLK_W = 12; // chromatic (sharps)
const CBLK_H = 17;
const BULL_W = 4;
const BULL_H = 14;

// Pitch panel geometry
const PP_X = GAME_W + 2;
const PP_W = PITCH_W - 4;
const PP_TOP = HUD_H + 4;
const PP_BOT = GAME_H - 46;
const PP_H = PP_BOT - PP_TOP;
const M_TOP = 84; // C6 MIDI
const M_BOT = 36; // C2 MIDI
const M_SPAN = M_TOP - M_BOT;

// Palette
const P = {
  bg: "#07071a",
  gridLine: "#0d0d2e",
  colActive: "#080f0b",
  label: "#2244dd",
  labelActive: "#33ffaa",
  hud: "#040410",
  score: "#00eeff",
  lives: "#ff2255",
  dBody: "#cc2200",
  dTop: "#ff5533",
  dShine: "#ff9977",
  dShad: "#551100",
  cBody: "#8800bb",
  cTop: "#cc44ff",
  cShine: "#ee88ff",
  bull: "#ffdd22",
  bullCore: "#ffffff",
  barrelDark: "#1e6644",
  barrelBod: "#267a55",
  wheel: "#164433",
  muzzle: "#33ffaa",
  ex: ["#ff8800", "#ffee00", "#ff4400", "#ff0000", "#ffffff"],
  ppBg: "#040412",
  ppSep: "#14143a",
  ppLine: "#0d0d30",
  ppC: "#1a1a55",
  ppLab: "#2244aa",
  ppCurrent: "#33ffaa",
  ppTrail: "#1a5535",
  ppHz: "#00eeff",
};

// ── Leaderboard (localStorage) ──────────────────────────────────────────
const LS_KEY = "pitch-blaster-v1";
function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveScore(name, score) {
  const all = loadScores();
  all.push({
    name: (name.trim() || "PLAYER").slice(0, 12).toUpperCase(),
    score,
  });
  all.sort((a, b) => b.score - a.score);
  const top = all.slice(0, 20);
  localStorage.setItem(LS_KEY, JSON.stringify(top));
  return top.slice(0, 10);
}

// ── Helpers ─────────────────────────────────────────────────────────────
const stToFC = (st) => ST_FC[st] ?? 0;
const fcToX = (fc) => fc * COL_W + COL_W / 2;
const midiToY = (m) => PP_TOP + ((M_TOP - m) / M_SPAN) * PP_H;
function pitchToFC(midiRounded) {
  return stToFC(((midiRounded % 12) + 12) % 12);
}

// ── Static stars (title bg, game area only) ─────────────────────────────
const STARS = Array.from({ length: 72 }, () => ({
  x: Math.random() * GAME_W,
  y: Math.random() * GAME_H,
  r: Math.random() < 0.14 ? 2 : 1,
  ph: Math.random() * Math.PI * 2,
}));

// ── Component ────────────────────────────────────────────────────────────
export default function MusicGame() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const pitchRef = useRef(null);
  const histRef = useRef([]); // midiFloat trail for panel

  const [phase, setPhase] = useState("title");
  const [finalScore, setFinalScore] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [scores, setScores] = useState(() => loadScores().slice(0, 10));
  const [detecting, setDetecting] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      const pad = 8;
      const available = window.innerWidth - pad * 2;
      setScale(available >= CANVAS_W ? 1 : available / CANVAS_W);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const { pitchInfo, micError } = usePitchDetector(detecting);

  // Always detect while this page is mounted
  useEffect(() => {
    setDetecting(true);
    return () => setDetecting(false);
  }, []);

  // Maintain pitch refs
  useEffect(() => {
    pitchRef.current = pitchInfo;
    if (pitchInfo) {
      histRef.current.push(pitchInfo.midiFloat);
      if (histRef.current.length > 55) histRef.current.shift();
    } else if (histRef.current.length > 0) {
      histRef.current.shift();
    }
  }, [pitchInfo]);

  // ── Pitch panel draw (stable, reads refs) ─────────────────────────────
  const drawPitchPanel = useCallback((ctx) => {
    // Background
    ctx.fillStyle = P.ppBg;
    ctx.fillRect(PP_X - 1, 0, PITCH_W + 1, GAME_H);
    // Separator
    ctx.fillStyle = P.ppSep;
    ctx.fillRect(GAME_W, 0, 2, GAME_H);

    // Note grid lines (diatonic only, C2–C6)
    for (let midi = M_BOT; midi <= M_TOP; midi++) {
      const st = midi % 12;
      if (!NOTE_ST.includes(st)) continue;
      const isC = st === 0;
      const y = Math.round(midiToY(midi));
      ctx.fillStyle = isC ? P.ppC : P.ppLine;
      ctx.fillRect(PP_X + 24, y, PP_W - 26, isC ? 2 : 1);
      if (isC) {
        const oct = Math.floor(midi / 12) - 1;
        ctx.font = "8px monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = P.ppLab;
        ctx.fillText(`C${oct}`, PP_X + 22, y + 4);
      }
    }

    // Trail dots
    const hist = histRef.current;
    hist.forEach((mf, i) => {
      const y = midiToY(mf);
      ctx.globalAlpha = 0.08 + 0.55 * (i / hist.length);
      ctx.fillStyle = P.ppTrail;
      ctx.fillRect(PP_X + 28, y - 1, PP_W - 30, 3);
    });
    ctx.globalAlpha = 1;

    // Current pitch bar + label
    const pi = pitchRef.current;
    if (pi) {
      const y = Math.round(midiToY(pi.midiFloat));
      // glow
      ctx.fillStyle = "rgba(51,255,170,0.12)";
      ctx.fillRect(PP_X + 24, y - 7, PP_W - 26, 15);
      // bar
      ctx.fillStyle = P.ppCurrent;
      ctx.fillRect(PP_X + 24, y - 2, PP_W - 26, 5);
      // note name + octave
      const st = ((pi.midiRounded % 12) + 12) % 12;
      const oct = Math.floor(pi.midiRounded / 12) - 1;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "right";
      ctx.fillStyle = P.ppCurrent;
      ctx.fillText(`${CHR_NAME[st]}${oct}`, PP_X + 22, y + 4);
    }

    // Hz label at bottom
    ctx.textAlign = "center";
    ctx.font = "8px monospace";
    ctx.fillStyle = pi ? P.ppHz : "#222244";
    ctx.fillText(
      pi ? `${pi.freq.toFixed(0)}Hz` : "--- Hz",
      PP_X + PP_W / 2,
      PP_BOT + 18,
    );

    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    for (let y = 0; y < GAME_H; y += 3) ctx.fillRect(PP_X, y, PITCH_W, 1);
  }, []);

  // ── Title-screen canvas animation ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "title") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0,
      id;

    const demo = Array.from({ length: 7 }, (_, i) => ({
      col: i,
      y: PLAY_TOP + i * 55 - 60,
      chr: i > 4,
    }));

    function tick() {
      frame++;
      // game area bg
      ctx.fillStyle = P.bg;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      // stars
      STARS.forEach((s) => {
        ctx.fillStyle =
          Math.sin(frame * 0.04 + s.ph) > 0.55 ? "#ffffff" : "#12123a";
        ctx.fillRect(s.x, s.y, s.r, s.r);
      });
      // col lines
      for (let i = 0; i < COLS; i++) {
        ctx.fillStyle = P.gridLine;
        ctx.fillRect(i * COL_W, 0, 1, GAME_H);
      }
      // drifting blocks
      demo.forEach((b) => {
        b.y += 0.45;
        if (b.y > GAME_H + 30) {
          b.y = PLAY_TOP - 40;
          b.col = Math.floor(Math.random() * COLS);
          b.chr = Math.random() < 0.25;
        }
        const cx = b.col * COL_W + COL_W / 2;
        if (b.chr) {
          const x = cx - CBLK_W / 2;
          ctx.fillStyle = "#330044";
          ctx.fillRect(x + 2, b.y + 3, CBLK_W, CBLK_H);
          ctx.fillStyle = P.cBody;
          ctx.fillRect(x, b.y, CBLK_W, CBLK_H);
          ctx.fillStyle = P.cTop;
          ctx.fillRect(x, b.y, CBLK_W, 4);
        } else {
          const x = cx - DBLK_W / 2;
          ctx.fillStyle = P.dShad;
          ctx.fillRect(x + 2, b.y + 3, DBLK_W, DBLK_H);
          ctx.fillStyle = P.dBody;
          ctx.fillRect(x, b.y, DBLK_W, DBLK_H);
          ctx.fillStyle = P.dTop;
          ctx.fillRect(x, b.y, DBLK_W, 4);
        }
      });
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let y = 0; y < GAME_H; y += 3) ctx.fillRect(0, y, GAME_W, 1);

      drawPitchPanel(ctx);
      id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase, drawPitchPanel]);

  // ── Game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Scale patterns: ascending / descending / mixed runs of 3-4 cols
    const SCALE_PATTERNS = [
      [0,1,2], [1,2,3], [2,3,4], [3,4,5], [4,5,6],   // ascending 3
      [2,1,0], [3,2,1], [4,3,2], [5,4,3], [6,5,4],   // descending 3
      [0,1,2,3], [3,4,5,6],                             // ascending 4
      [3,2,1,0], [6,5,4,3],                             // descending 4
      [0,2,4], [1,3,5], [2,4,6],                        // skip-one (C-E-G feel)
    ];

    const s = {
      fCol: 3,
      cannonX: fcToX(3),
      bullets: [],
      blocks: [],
      exps: [],
      burst: [],     // { col, countdown, chr } — queued burst blocks
      score: 0,
      lives: 3,
      frame: 0,
      lastShot: -60,
      shotRate: 52,
      blkRate: 90,
      blkSpeed: 1.0,
      over: false,
    };

    const px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };

    function drawGrid() {
      for (let i = 0; i < COLS; i++) {
        px(
          i * COL_W,
          HUD_H,
          COL_W,
          GAME_H - HUD_H,
          Math.abs(i - s.fCol) < 0.55 ? P.colActive : P.bg,
        );
        px(i * COL_W, HUD_H, 1, GAME_H - HUD_H, P.gridLine);
      }
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      NOTES.forEach((n, i) => {
        ctx.fillStyle = Math.abs(i - s.fCol) < 0.55 ? P.labelActive : P.label;
        ctx.fillText(n, i * COL_W + COL_W / 2, HUD_H + 19);
      });
      px(0, HUD_H + LABEL_H - 1, GAME_W, 1, "#14143a");
    }

    function drawHUD() {
      px(0, 0, GAME_W, HUD_H, P.hud);
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = P.score;
      ctx.fillText(`SCORE  ${String(s.score).padStart(6, "0")}`, 8, 22);
      ctx.textAlign = "right";
      ctx.fillStyle = P.lives;
      ctx.fillText("♥".repeat(Math.max(0, s.lives)), GAME_W - 8, 22);
      px(0, HUD_H - 1, GAME_W, 1, "#1a1a44");
    }

    function drawBlock(b) {
      const cx = b.screenX;
      if (b.chr) {
        const x = cx - CBLK_W / 2;
        px(x + 2, b.y + 3, CBLK_W, CBLK_H, "#330044");
        px(x, b.y, CBLK_W, CBLK_H, P.cBody);
        px(x, b.y, CBLK_W, 4, P.cTop);
        px(x + 2, b.y + 2, 4, 2, P.cShine);
      } else {
        const x = cx - DBLK_W / 2;
        px(x + 2, b.y + 3, DBLK_W, DBLK_H, P.dShad);
        px(x, b.y, DBLK_W, DBLK_H, P.dBody);
        px(x, b.y, DBLK_W, 4, P.dTop);
        px(x + 3, b.y + 2, 5, 2, P.dShine);
      }
    }

    function drawBullet(b) {
      ctx.fillStyle = "rgba(255,220,0,0.25)";
      ctx.fillRect(b.x - 1, b.y - 6, 2, 6);
      px(b.x - 2, b.y, BULL_W, BULL_H, P.bull);
      px(b.x - 1, b.y, 2, 4, P.bullCore);
    }

    function drawCannon(cx) {
      const by = CANNON_Y;
      ctx.fillStyle = "rgba(51,255,170,0.09)";
      ctx.fillRect(cx - 6, by - 44, 12, 28);
      px(cx - 4, by - 42, 8, 24, P.barrelDark);
      px(cx - 3, by - 44, 6, 5, P.muzzle);
      px(cx - 22, by - 20, 44, 20, P.barrelBod);
      px(cx - 22, by - 20, 44, 4, "#2a9966");
      px(cx - 8, by - 12, 16, 4, "#1e6644");
      px(cx - 22, by - 8, 12, 8, P.wheel);
      px(cx + 10, by - 8, 12, 8, P.wheel);
      px(cx - 20, by - 6, 8, 4, "#226644");
      px(cx + 12, by - 6, 8, 4, "#226644");
    }

    function drawExplosion(e) {
      const t = e.f / 14;
      if (t >= 1) return;
      ctx.globalAlpha = 1 - t;
      const r = t * 26 + 4;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + e.f * 0.5;
        const ex = e.cx + Math.cos(a) * r,
          ey = e.cy + Math.sin(a) * r;
        ctx.fillStyle = P.ex[(e.f + i) % 5];
        ctx.fillRect(ex - 4, ey - 4, 8, 8);
        if (t < 0.5) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(ex - 2, ey - 2, 4, 4);
        }
      }
      if (e.f < 4) {
        ctx.globalAlpha = ((4 - e.f) / 4) * 0.85;
        px(e.cx - 10, e.cy - 10, 20, 20, "#fff");
      }
      ctx.globalAlpha = 1;
    }

    function pushBlock(col, chr) {
      if (chr) {
        const chrSTs = [1, 3, 6, 8, 10];
        const st = chrSTs[Math.floor(Math.random() * chrSTs.length)];
        const fc = stToFC(st);
        s.blocks.push({ chr:true, fc, screenX:fcToX(fc), y:PLAY_TOP+LABEL_H, alive:true, bw:CBLK_W, bh:CBLK_H, pts:20 });
      } else {
        s.blocks.push({ chr:false, fc:col, screenX:fcToX(col), y:PLAY_TOP+LABEL_H, alive:true, bw:DBLK_W, bh:DBLK_H, pts:10 });
      }
    }

    function spawnBlock() {
      const rand = Math.random();
      if (rand < 0.08) {
        // Chromatic (8%) — occasional sharp
        pushBlock(0, true);
      } else if (rand < 0.38) {
        // Scale burst (30%) — pick a run pattern, fire 1 now, queue the rest
        const pat = SCALE_PATTERNS[Math.floor(Math.random() * SCALE_PATTERNS.length)];
        pushBlock(pat[0], false);
        pat.slice(1).forEach((col, i) => {
          s.burst.push({ col, countdown: (i + 1) * 14 }); // ~14 frames apart ≈ 0.23 s each
        });
      } else {
        // Single random diatonic (62%)
        pushBlock(Math.floor(Math.random() * COLS), false);
      }
    }

    function update() {
      s.frame++;
      const pi = pitchRef.current;
      if (pi?.midiRounded) s.fCol = pitchToFC(pi.midiRounded);

      const tx = fcToX(s.fCol);
      s.cannonX += (tx - s.cannonX) * 0.15;

      // Auto-fire
      if (s.frame - s.lastShot >= s.shotRate) {
        s.bullets.push({ x: s.cannonX, y: CANNON_Y - 44 });
        s.lastShot = s.frame;
      }

      // Move bullets
      s.bullets.forEach((b) => {
        b.y -= 10;
      });
      s.bullets = s.bullets.filter((b) => b.y > PLAY_TOP);

      // Drain burst queue (each item counts down independently)
      if (s.burst.length > 0) {
        s.burst[0].countdown--;
        if (s.burst[0].countdown <= 0) {
          const item = s.burst.shift();
          pushBlock(item.col, false);
        }
      }

      // Spawn (skip if a burst is still in queue, to avoid overlap chaos)
      if (s.frame % s.blkRate === 0 && s.burst.length === 0) spawnBlock();

      // Difficulty ramp every ~8 sec (480 frames)
      if (s.frame % 480 === 0 && s.frame > 0) {
        s.blkSpeed = Math.min(s.blkSpeed + 0.2, 3.8);
        s.blkRate = Math.max(s.blkRate - 5, 35);
        s.shotRate = Math.max(s.shotRate - 2, 26);
      }

      // Move blocks
      s.blocks.forEach((b) => {
        if (b.alive) b.y += s.blkSpeed;
      });

      // Bullet × block
      s.bullets.forEach((bullet) => {
        s.blocks.forEach((block) => {
          if (!block.alive) return;
          const hw = block.bw / 2 + BULL_W / 2;
          if (
            Math.abs(bullet.x - block.screenX) <= hw &&
            bullet.y <= block.y + block.bh &&
            bullet.y + BULL_H >= block.y
          ) {
            block.alive = false;
            bullet.y = -9999;
            s.score += block.pts;
            s.exps.push({
              cx: block.screenX,
              cy: block.y + block.bh / 2,
              f: 0,
            });
          }
        });
      });

      // Block hits floor
      s.blocks.forEach((block) => {
        if (block.alive && block.y + block.bh >= CANNON_Y - 20) {
          block.alive = false;
          s.lives--;
          s.exps.push({ cx: block.screenX, cy: CANNON_Y - 20, f: 0 });
          if (s.lives <= 0) s.over = true;
        }
      });

      s.blocks = s.blocks.filter((b) => b.alive && b.y < GAME_H + 50);
      s.exps.forEach((e) => e.f++);
      s.exps = s.exps.filter((e) => e.f < 14);
    }

    function render() {
      ctx.clearRect(0, 0, CANVAS_W, GAME_H);
      drawGrid();
      s.blocks.filter((b) => b.alive).forEach(drawBlock);
      s.bullets.forEach(drawBullet);
      s.exps.forEach(drawExplosion);
      drawCannon(s.cannonX);
      drawHUD();
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let y = 0; y < GAME_H; y += 3) ctx.fillRect(0, y, GAME_W, 1);
      drawPitchPanel(ctx);
    }

    function loop() {
      if (s.over) {
        render();
        setFinalScore(s.score);
        setPhase("gameover");
        return;
      }
      update();
      render();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, drawPitchPanel]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStart = () => {
    setNameInput("");
    setPhase("playing");
  };
  const handleSubmit = () => {
    const top = saveScore(nameInput, finalScore);
    setScores(top);
    setPhase("title");
  };

  const detectedNote = pitchInfo
    ? CHR_NAME[((pitchInfo.midiRounded % 12) + 12) % 12]
    : null;

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      {/* Outer clip wrapper — shrinks on mobile via scale */}
      <div style={{
        position: "relative",
        width: CANVAS_W * scale,
        height: GAME_H * scale,
        border: "2px solid #13133a",
        boxShadow: "0 0 40px rgba(0,100,255,0.15), 0 0 80px rgba(0,30,100,0.1)",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Inner scaled content */}
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          width: CANVAS_W,
          height: GAME_H,
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={GAME_H}
            style={S.canvas}
          />

          {/* ── TITLE ── */}
          {phase === "title" && (
            <div style={{ ...S.overlay, width: GAME_W }}>
              <div style={S.box}>
                <div style={S.title}>♪ PITCH BLASTER ♪</div>
                <div style={S.sub}>8-BIT MUSIC SHOOTER</div>
                <div style={S.hr} />
                <div style={S.rules}>
                  <div>
                    🎤 Sing <b style={{ color: "#33ffaa" }}>C D E F G A B</b> to
                    move cannon
                  </div>
                  <div style={{ color: "#cc88ff" }}>
                    🟣 Purple blocks = sharps (×2 pts)
                  </div>
                  <div>🔫 Bullets auto-fire — aim precisely!</div>
                  <div>💀 3 lives — don't let blocks land</div>
                </div>
                <button
                  style={S.btn}
                  onClick={handleStart}
                  onMouseEnter={(e) => Object.assign(e.target.style, S.btnH)}
                  onMouseLeave={(e) => Object.assign(e.target.style, S.btn)}
                >
                  ▶ START GAME
                </button>
                {scores.length > 0 && (
                  <>
                    <div style={S.hr} />
                    <div style={S.boardTitle}>── HIGH SCORES ──</div>
                    <div style={S.board}>
                      {scores.slice(0, 8).map((sc, i) => (
                        <div
                          key={i}
                          style={{
                            ...S.bRow,
                            color:
                              i === 0 ? "#ffee22" : i < 3 ? "#00eeff" : "#556688",
                          }}
                        >
                          <span style={S.bRank}>{i + 1}.</span>
                          <span style={S.bName}>{sc.name}</span>
                          <span style={S.bScore}>
                            {String(sc.score).padStart(6, "0")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── GAME OVER + NAME ENTRY ── */}
          {phase === "gameover" && (
            <div style={{ ...S.overlay, width: GAME_W }}>
              <div style={S.box}>
                <div
                  style={{
                    ...S.title,
                    color: "#ff3344",
                    textShadow: "0 0 14px #ff334499",
                  }}
                >
                  GAME OVER
                </div>
                <div style={S.bigScore}>
                  {String(finalScore).padStart(6, "0")}
                </div>
                <div
                  style={{
                    color: "#334488",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                  }}
                >
                  FINAL SCORE
                </div>
                <div style={S.hr} />
                <div
                  style={{
                    color: "#8899bb",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  ENTER YOUR NAME:
                </div>
                <input
                  style={S.inp}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  maxLength={12}
                  autoFocus
                  placeholder="PLAYER"
                  spellCheck={false}
                />
                <button
                  style={S.btn}
                  onClick={handleSubmit}
                  onMouseEnter={(e) => Object.assign(e.target.style, S.btnH)}
                  onMouseLeave={(e) => Object.assign(e.target.style, S.btn)}
                >
                  ✓ SAVE &amp; SCOREBOARD
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div style={{ ...S.bar, width: CANVAS_W * scale }}>
        <span style={{ color: "#222244", fontSize: 11 }}>PITCH</span>
        {detectedNote ? (
          <span style={S.noteTag}>{detectedNote}</span>
        ) : (
          <span style={S.silence}>—</span>
        )}
        {pitchInfo && <span style={S.hz}>{pitchInfo.freq.toFixed(0)} Hz</span>}
        {micError && <span style={S.err}>🎤 {micError}</span>}
        <span style={{ marginLeft: "auto", color: "#111133", fontSize: 10 }}>
          {phase === "playing" ? "● LIVE" : ""}
        </span>
      </div>

      {/* ── FAB: back to Pitch Trainer ── */}
      <a href="#/" style={S.fab} title="Pitch Trainer">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
        </svg>
      </a>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#030310",
    fontFamily: '"Courier New",Courier,monospace',
    userSelect: "none",
  },
  canvas: { display: "block", imageRendering: "pixelated" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    background: "rgba(3,3,18,0.86)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(1px)",
  },
  box: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "28px 32px",
    border: "1px solid #1a1a44",
    background: "rgba(5,5,22,0.94)",
    boxShadow: "0 0 22px rgba(0,60,200,0.12)",
    maxWidth: 340,
  },
  title: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#00eeff",
    letterSpacing: "0.16em",
    textShadow: "0 0 12px #00eeff55",
  },
  sub: {
    fontSize: 10,
    color: "#2240aa",
    letterSpacing: "0.25em",
    marginTop: -6,
  },
  hr: {
    width: "100%",
    height: 1,
    background: "linear-gradient(90deg,transparent,#1e1e66,transparent)",
  },
  rules: {
    fontSize: 12,
    color: "#8899bb",
    lineHeight: 1.9,
    textAlign: "left",
    alignSelf: "stretch",
  },
  btn: {
    padding: "9px 28px",
    background: "transparent",
    border: "2px solid #33ffaa",
    color: "#33ffaa",
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: '"Courier New",Courier,monospace',
    cursor: "pointer",
    letterSpacing: "0.1em",
    marginTop: 4,
  },
  btnH: {
    padding: "9px 28px",
    background: "#33ffaa",
    border: "2px solid #33ffaa",
    color: "#030310",
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: '"Courier New",Courier,monospace',
    cursor: "pointer",
    letterSpacing: "0.1em",
    marginTop: 4,
    boxShadow: "0 0 14px #33ffaa55",
  },
  fab: {
    position: "fixed",
    bottom: 20,
    right: 20,
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
  },
  bigScore: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#ffee22",
    letterSpacing: "0.15em",
    textShadow: "0 0 14px #ffee2255",
  },
  inp: {
    background: "transparent",
    border: "1px solid #2244aa",
    color: "#33ffaa",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "inherit",
    textAlign: "center",
    letterSpacing: "0.2em",
    padding: "8px 16px",
    outline: "none",
    width: 180,
    textTransform: "uppercase",
  },
  boardTitle: { color: "#334488", fontSize: 11, letterSpacing: "0.15em" },
  board: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignSelf: "stretch",
  },
  bRow: { display: "flex", gap: 6, fontSize: 11, fontFamily: "monospace" },
  bRank: { width: 18, textAlign: "right", opacity: 0.7 },
  bName: { flex: 1, letterSpacing: "0.05em" },
  bScore: { letterSpacing: "0.08em", fontWeight: "bold" },
  bar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
    width: CANVAS_W,
    padding: "4px 10px",
    borderTop: "1px solid #0d0d28",
    background: "#030310",
    fontSize: 12,
    fontFamily: "monospace",
  },
  noteTag: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#33ffaa",
    textShadow: "0 0 8px #33ffaa88",
    minWidth: 24,
  },
  silence: { color: "#111133", fontSize: 12 },
  hz: { color: "#334455", fontSize: 11 },
  err: { color: "#ff3344", fontSize: 11 },
};
