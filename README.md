# Pitch Trainer 🎵

A real-time pitch detection web app built with React + Vite. Uses the Web Audio API to listen to your microphone and display the detected musical note, frequency, and how many cents sharp or flat you are.

## Features

- Real-time pitch detection via microphone
- Displays note name in Western (C/D/E…) or Solfège (Do/Re/Mi…) notation
- Frequency (Hz) and cents deviation display
- Transpose support for different instruments
- Responsive layout with a collapsible settings drawer
- Fix / Detect toggle to freeze the current reading

## Tech Stack

- React 18
- Vite 4
- Web Audio API (no external audio libraries)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> The app requires microphone permission. Make sure to allow access when prompted.

## Build

```bash
npm run build
```

Output goes to the `dist/` folder.

## License

MIT
