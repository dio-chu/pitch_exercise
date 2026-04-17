import { useState, useEffect, useRef } from "react";
import { detectPitch } from "../utils/pitchDetection";
import { frequencyToMidi } from "../utils/noteUtils";

export function usePitchDetector(enabled) {
  const [pitchInfo, setPitchInfo] = useState(null);
  const [micError, setMicError] = useState(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);

  const prevFreqRef = useRef(null);
  const smoothBufferRef = useRef([]);
  const SMOOTH_WINDOW = 5; // 取最近 3 幀（≈50ms），兼顧穩定與反應速度
  const MIN_READINGS = 2; // 至少累積 3 幀才輸出（≈50ms），可過濾開口誤判又不會太慢
  const MAX_SPREAD_ST = 1.5; // 放寬散布容忍度，換音過渡時不會卡太久

  useEffect(() => {
    if (!enabled) {
      setPitchInfo(null);
      prevFreqRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let active = true;
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      })
      .then((stream) => {
        if (!active) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);

        const loop = () => {
          if (!active) return;
          analyser.getFloatTimeDomainData(buffer);
          let freq = detectPitch(buffer, ctx.sampleRate);

          // 人聲下限：C2 ≈ 65.41 Hz，低於此視為雜訊
          if (freq !== null && freq < 65.41) freq = null;

          if (freq !== null) {
            if (prevFreqRef.current !== null) {
              const prev = prevFreqRef.current;
              const ratio = freq / prev;

              /**
               * 核心優化：八度跳躍補正
               * 如果檢測到的頻率大約是前一個頻率的 0.5 倍（掉八度）
               * 且目前的頻率處於較低音域，而前一個是中音
               * 我們「試探性」地將它翻倍，看是否更合理。
               */
              if (ratio > 0.45 && ratio < 0.55) {
                // 可能是誤判為低八度，嘗試恢復
                // 如果你正在唱 G3 -> G4，但它檢測出 G3 -> G3，這部分交給 YIN 的動態閾值處理
                // 這裡處理的是 G3 -> G2 的誤判
                freq = freq * 2;
              } else if (ratio > 1.9 && ratio < 2.1) {
                // 這是正常的八度跳躍（如 G3 -> G4），予以保留
              }
            }

            smoothBufferRef.current.push(freq);
            if (smoothBufferRef.current.length > SMOOTH_WINDOW)
              smoothBufferRef.current.shift();

            prevFreqRef.current = freq;

            // 累積幀數不足時先不輸出，避免開口瞬間誤判
            if (smoothBufferRef.current.length < MIN_READINGS) {
              rafRef.current = requestAnimationFrame(loop);
              return;
            }

            // 用中位數取代平均值：對偶發八度誤判有強力過濾效果
            const sorted = [...smoothBufferRef.current].sort((a, b) => a - b);
            const medianFreq = sorted[Math.floor(sorted.length / 2)];

            // 散布檢查：若這批讀數音高跨度過大（正在換音），暫不更新顯示
            const midiValues = smoothBufferRef.current.map(frequencyToMidi);
            const spread = Math.max(...midiValues) - Math.min(...midiValues);
            if (spread > MAX_SPREAD_ST) {
              rafRef.current = requestAnimationFrame(loop);
              return;
            }

            const midiFloat = frequencyToMidi(medianFreq);
            setPitchInfo({
              freq: medianFreq,
              midiFloat,
              midiRounded: Math.round(midiFloat),
              cents: (midiFloat - Math.round(midiFloat)) * 100,
            });
          } else {
            // 靜音時清空緩衝區，下次發聲才重新累積
            smoothBufferRef.current = [];
            setPitchInfo(null);
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch((err) => setMicError(err.message));

    return () => {
      active = false;
      ctxRef.current?.close();
    };
  }, [enabled]);

  return { pitchInfo, micError };
}
