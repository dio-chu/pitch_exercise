/**
 * YIN pitch detection algorithm.
 * Returns frequency in Hz, or null if no clear pitch detected.
 *
 * Reference: de Cheveigné & Kawahara (2002)
 */
export function detectPitch(buffer, sampleRate) {
  const N = buffer.length;
  const halfN = Math.floor(N / 2);

  // RMS check — bail if signal is too quiet
  // Lower threshold for better mobile sensitivity
  let rmsSum = 0;
  for (let i = 0; i < N; i++) rmsSum += buffer[i] * buffer[i];
  if (Math.sqrt(rmsSum / N) < 0.0015) return null;

  // ── Step 1: Cumulative Mean Normalized Difference Function ──
  const cmndf = new Float32Array(halfN);
  cmndf[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau < halfN; tau++) {
    let d = 0;
    for (let j = 0; j < halfN; j++) {
      const diff = buffer[j] - buffer[j + tau];
      d += diff * diff;
    }
    runningSum += d;
    cmndf[tau] = runningSum > 0 ? (d * tau) / runningSum : 1;
  }

  // ── Step 2: Absolute threshold search (C2 ≈ 65 Hz to C7 ≈ 2093 Hz) ──
  const minTau = Math.max(2, Math.floor(sampleRate / 2200));
  const maxTau = Math.min(halfN - 2, Math.ceil(sampleRate / 60));
  const THRESHOLD = 0.12; // Lower threshold for better detection

  let tau = minTau;
  let tauCandidate = -1;

  while (tau < maxTau) {
    if (cmndf[tau] < THRESHOLD) {
      // Slide to the local minimum
      while (tau + 1 < maxTau && cmndf[tau + 1] < cmndf[tau]) tau++;
      tauCandidate = tau;
      break;
    }
    tau++;
  }

  // ── Step 3: Best-local-estimate fallback ──
  if (tauCandidate === -1) {
    let bestVal = Infinity;
    for (let t = minTau; t < maxTau; t++) {
      if (cmndf[t] < bestVal) {
        bestVal = cmndf[t];
        tauCandidate = t;
      }
    }
    if (bestVal >= 0.45) return null; // too uncertain
  }

  // ── Step 4: Parabolic interpolation for sub-sample accuracy ──
  // Formula: t_min = tau + (a - c) / (2 * (a - 2b + c))
  // where a = cmndf[tau-1], b = cmndf[tau], c = cmndf[tau+1]
  let betterTau = tauCandidate;
  if (tauCandidate > minTau && tauCandidate < maxTau) {
    const a = cmndf[tauCandidate - 1];
    const b = cmndf[tauCandidate];
    const c = cmndf[tauCandidate + 1];
    const denom = a - 2 * b + c;
    if (Math.abs(denom) > 1e-7) {
      betterTau = tauCandidate + (a - c) / (2 * denom);
    }
  }

  const freq = sampleRate / betterTau;

  // Sanity check
  if (freq < 60 || freq > 2200) return null;

  return freq;
}
