export const TRANSLATIONS = {
  zh: {
    appTitle: "音準訓練",
    paused: "暫停中",
    fix: "暫停",
    detect: "偵測",
    settings: "設定",
    autoScroll: "自動捲動",
    followPitch: "跟隨音高",
    noteLabels: "音名顯示",
    theme: "主題",
    language: "語言",
    themeDefault: "深色",
    themeBlue: "藍色",
    themePurple: "紫色",
  },
  en: {
    appTitle: "Pitch Trainer",
    paused: "Paused",
    fix: "Fix",
    detect: "Detect",
    settings: "Settings",
    autoScroll: "Auto-Scroll",
    followPitch: "Follow Pitch",
    noteLabels: "Note Labels",
    theme: "Theme",
    language: "Language",
    themeDefault: "Dark",
    themeBlue: "Blue",
    themePurple: "Purple",
  },
};

export function useT(lang) {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.zh;
}
