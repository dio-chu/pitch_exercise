# 音準練習 🎵

即時音高偵測網頁應用，使用 React + Vite 建構。透過 Web Audio API 聆聽麥克風輸入，即時顯示偵測到的音符名稱、頻率，以及音準偏差（音分）。

**🌐 線上體驗：[https://dio-chu.github.io/pitch_exercise/](https://dio-chu.github.io/pitch_exercise/)**

---

## 截圖

| 主畫面 | 設定面板 | 暫停狀態 |
|--------|----------|----------|
| ![主畫面](docs/screenshot-main.png) | ![設定面板](docs/screenshot-settings.png) | ![暫停狀態](docs/screenshot-paused.png) |

---

## 功能特色

- 即時音高偵測（透過麥克風）
- 顯示音符名稱，支援西方記譜法（C/D/E…）與唱名（Do/Re/Mi…）
- 顯示頻率（Hz）與音分偏差
- 支援移調，適用不同樂器
- 響應式排版，設定面板可收折
- Fix / Detect 切換按鈕，可凍結當前讀數

## 技術棧

- React 18
- Vite 4
- Web Audio API（無額外音訊函式庫）

## 本地開發

```bash
npm install
npm run dev
```

開啟瀏覽器前往 [http://localhost:5173](http://localhost:5173)

> 應用程式需要麥克風權限，請在瀏覽器提示時允許存取。

## 建置

```bash
npm run build
```

產出檔案位於 `dist/` 資料夾。

## License

MIT
