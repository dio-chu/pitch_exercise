export function detectPitch(buffer, sampleRate) {
  const N = buffer.length;
  const halfN = Math.floor(N / 2);

  let rmsSum = 0;
  for (let i = 0; i < N; i++) rmsSum += buffer[i] * buffer[i];
  const rms = Math.sqrt(rmsSum / N);
  if (rms < 0.001) return null; // 放寬門檻，避免短音節或弱音被靜音過濾掉

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

  // 搜尋範圍：C2 (65Hz) 到 C7 (2093Hz)
  const minTau = Math.max(2, Math.floor(sampleRate / 2200));
  const maxTau = Math.min(halfN - 2, Math.ceil(sampleRate / 60));

  /**
   * 改進：動態閾值搜尋
   * 我們先用一個較嚴格的閾值 (0.1) 找高音（短週期）。
   * 如果找不到，再放寬到 0.18。這能強迫算法優先看 G4 而不是 G3。
   */
  let tauCandidate = -1;
  const thresholds = [0.1, 0.18];

  for (const threshold of thresholds) {
    for (let t = minTau; t < maxTau; t++) {
      if (cmndf[t] < threshold) {
        while (t + 1 < maxTau && cmndf[t + 1] < cmndf[t]) t++;
        tauCandidate = t;
        break;
      }
    }
    if (tauCandidate !== -1) break;
  }

  if (tauCandidate === -1) return null;

  // 拋物線插值
  let betterTau = tauCandidate;
  const a = cmndf[tauCandidate - 1];
  const b = cmndf[tauCandidate];
  const c = cmndf[tauCandidate + 1];
  const denom = a - 2 * b + c;
  if (Math.abs(denom) > 1e-7) {
    betterTau = tauCandidate + (a - c) / (2 * denom);
  }

  return sampleRate / betterTau;
}
