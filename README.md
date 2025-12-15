# 低軌衛星氣象 Line Bot

使用 Google Apps Script 建立的低軌衛星氣象查詢 Line Bot，支援天氣、海洋洋流資料查詢與衛星雲圖連結。

## 功能特色

- 🌤️ **天氣查詢** - 透過 OpenWeatherMap API 取得即時天氣資訊
- 🌊 **海洋資料** - 透過 Stormglass API 取得浪高、洋流、水溫等資料
- 🛰️ **衛星雲圖** - 提供多個衛星雲圖連結（向日葵、NASA、Windy）
- 📍 **地區選擇** - 8 個預設台灣地區 + 自訂輸入功能
- 📊 **資料記錄** - 自動將查詢記錄儲存到 Google Sheet

## 使用方式

在 Line 中傳送「**低軌衛星**」即可開啟選單：

| 選項 | 功能 |
|------|------|
| 1 | 🌤️ 查詢天氣狀況 |
| 2 | 🌊 查詢海洋/洋流資料 |
| 3 | 🛰️ 取得衛星雲圖連結 |
| 4 | 📊 查詢所有資料 |
| 5 | 📖 顯示使用說明 |

## 快速開始

### 1. 取得 API Key

- **OpenWeatherMap**: https://openweathermap.org/api (免費 60次/分鐘)
- **Stormglass**: https://stormglass.io/ (免費 10次/天)
- **Line Bot**: https://developers.line.biz/

### 2. 建立 Google Sheet

建立新的 Google 試算表並記下 Sheet ID。

### 3. 使用程式碼生成器

前往 **[GAS 程式碼生成器](https://leo-gas-linebot.netlify.app/)** 填入 API Key，自動生成完整 GAS 程式碼。

### 4. 部署到 Google Apps Script

1. 在 Google Sheet 中開啟「擴充功能」→「Apps Script」
2. 貼上生成的程式碼
3. 部署為「網頁應用程式」
4. 將部署網址設定為 Line Bot 的 Webhook URL

## 專案結構

```
satellite-linebot/
├── Code.gs                    # 主要 GAS 程式碼
├── 教學文件.md                  # 完整教學文件
├── generator/                  # 程式碼生成器
│   ├── index.html
│   ├── style.css
│   ├── generator.js
│   └── netlify.toml
└── slides/                     # 教學簡報
    ├── index.html              # 課程目錄
    ├── Part1_低軌衛星介紹.html
    ├── Part2_衛星訊號與API.html
    ├── Part3_Line_Bot設定.html
    ├── Part4_GAS程式開發.html
    └── Part5_部署與測試.html
```

## 教學簡報

完整的 5 單元教學簡報，涵蓋：

1. **低軌衛星介紹** - LEO 衛星原理與應用
2. **衛星訊號與 API** - API 概念與使用方式
3. **Line Bot 設定** - 建立 Line Bot 與取得 Token
4. **GAS 程式開發** - Google Apps Script 開發流程
5. **部署與測試** - 上線部署與除錯

## API 資料來源

| API | 用途 | 免費額度 |
|-----|------|----------|
| OpenWeatherMap | 天氣資料 | 60 次/分鐘 |
| Stormglass | 海洋資料 | 10 次/天 |
| 衛星雲圖 | 公開連結 | 無限制 |

## 作者

**曾慶良 阿亮老師**

- 📘 [Facebook](https://www.facebook.com/iddmail)
- 🎥 [YouTube](https://www.youtube.com/@Liang-yt02)
- 🔬 [3A科技實驗室](https://www.facebook.com/groups/2754139931432955)

## 授權

MIT License

---

© 2025 低軌衛星氣象資料教學專案
