export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const SOLFEGE_NAMES = ["Do", "Re", "Mi", "Fa", "So", "La", "Ti"];
export const NUMBER_NAMES = ["1", "2", "3", "4", "5", "6", "7"];
export const CHROMATIC_WESTERN = [
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

export const TRANSPOSE_OPTIONS = [
  { label: "Do = C", semitone: 0 },
  { label: "Do = B", semitone: 11 },
  { label: "Do = B\u266d A#", semitone: 10 },
  { label: "Do = A", semitone: 9 },
  { label: "Do = A\u266d G#", semitone: 8 },
  { label: "Do = G", semitone: 7 },
  { label: "Do = G\u266d F#", semitone: 6 },
  { label: "Do = F", semitone: 5 },
  { label: "Do = E", semitone: 4 },
  { label: "Do = E\u266d D#", semitone: 3 },
  { label: "Do = D", semitone: 2 },
  { label: "Do = D\u266d C#", semitone: 1 },
];

/**
 * Generate transpose label based on label type
 * @param {number} semitone - The semitone offset (0-11)
 * @param {string} labelType - 'western', 'solfege', or 'number'
 * @returns {string} - The formatted transpose label
 */
export function getTransposeLabel(semitone, labelType) {
  const noteName = CHROMATIC_WESTERN[semitone];

  if (labelType === "western") {
    return `C = ${noteName}`;
  } else if (labelType === "number") {
    return `1 = ${noteName}`;
  } else {
    // solfege
    return `Do = ${noteName}`;
  }
}

export function frequencyToMidi(freq) {
  return 12 * Math.log2(freq / 440) + 69;
}

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Returns label string for a given note, or null if not a labeled note.
 * C notes are always returned regardless of key.
 */
export function getNoteInfo(semitone, octave, labelType, transposeOffset) {
  const isC = semitone === 0;
  const relativeToRoot = (((semitone - transposeOffset) % 12) + 12) % 12;
  const degreeIndex = MAJOR_SCALE_INTERVALS.indexOf(relativeToRoot);
  const isDiatonic = degreeIndex !== -1;

  let label = null;

  // Western mode: show all notes
  if (labelType === "western") {
    label = CHROMATIC_WESTERN[semitone] + octave;
  }
  // Solfege/Number mode: show only diatonic notes
  else if (isDiatonic) {
    if (labelType === "solfege") {
      label = SOLFEGE_NAMES[degreeIndex];
    } else {
      label = NUMBER_NAMES[degreeIndex];
    }
  }

  return { label, isDiatonic, isC };
}

// C7 = MIDI 96, C2 = MIDI 36; generate top-to-bottom
export function generateNoteGrid() {
  const notes = [];
  for (let midi = 96; midi >= 36; midi--) {
    const semitone = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    notes.push({ midi, semitone, octave });
  }
  return notes;
}
