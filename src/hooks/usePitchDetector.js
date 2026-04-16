import { useState, useEffect, useRef } from "react";
import { detectPitch } from "../utils/pitchDetection";
import { frequencyToMidi } from "../utils/noteUtils";

/**
 * Continuously reads microphone input and returns pitch information.
 * When `enabled` is false, stops the audio context and returns null.
 */
export function usePitchDetector(enabled) {
  const [pitchInfo, setPitchInfo] = useState(null);
  const [micError, setMicError] = useState(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const prevFreqRef = useRef(null); // for octave-stability heuristic
  const smoothBufferRef = useRef([]); // for smoothing frequency readings
  const SMOOTH_WINDOW = 3; // number of samples to average

  useEffect(() => {
    if (!enabled) {
      setPitchInfo(null);
      prevFreqRef.current = null;
      smoothBufferRef.current = [];
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let active = true;
    setMicError(null);

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
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        // 4096 samples → better resolution for low notes (C2 ≈ 65 Hz)
        analyser.fftSize = 4096;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);

        const loop = () => {
          if (!active) return;
          analyser.getFloatTimeDomainData(buffer);
          let freq = detectPitch(buffer, ctx.sampleRate);

          if (freq !== null) {
            // ── Octave-stability heuristic (improved) ──
            if (prevFreqRef.current !== null) {
              const prev = prevFreqRef.current;
              const octUp = freq * 2;
              const octDown = freq / 2;
              const semidist = (f) => Math.abs(12 * Math.log2(f / prev));

              // Check if an octave is closer
              const candidates = [freq, octUp, octDown].filter(
                (f) => f >= 60 && f <= 2200,
              );
              const best = candidates.reduce((a, b) =>
                semidist(a) <= semidist(b) ? a : b,
              );

              // Snap to octave if current reading is off by more than 4 semitones
              if (semidist(freq) > 4 && semidist(best) < semidist(freq)) {
                freq = best;
              }
            }

            // ── Smoothing filter ──
            smoothBufferRef.current.push(freq);
            if (smoothBufferRef.current.length > SMOOTH_WINDOW) {
              smoothBufferRef.current.shift();
            }
            const smoothedFreq =
              smoothBufferRef.current.reduce((a, b) => a + b, 0) /
              smoothBufferRef.current.length;

            prevFreqRef.current = smoothedFreq;
            const midiFloat = frequencyToMidi(smoothedFreq);
            const midiRounded = Math.round(midiFloat);
            const cents = (midiFloat - midiRounded) * 100;
            setPitchInfo({ freq: smoothedFreq, midiFloat, midiRounded, cents });
          } else {
            // Clear smooth buffer on silence
            if (smoothBufferRef.current.length > 0) {
              smoothBufferRef.current = [];
            }
            setPitchInfo(null);
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      })
      .catch((err) => {
        console.error("Microphone error:", err);
        setMicError(err.message || "Microphone access denied");
      });

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        sourceRef.current?.disconnect();
      } catch (_) {}
      ctxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      rafRef.current = null;
    };
  }, [enabled]);

  return { pitchInfo, micError };
}
