/**
 * 低軌衛星氣象資料 Line Bot - Google Apps Script
 * 功能：互動式選單查詢天氣、洋流、衛星雲圖資料
 *
 * 使用的 API：
 * 1. OpenWeatherMap - 天氣資料
 * 2. Stormglass - 洋流/海洋資料
 * 3. 向日葵衛星 / Windy / NASA - 衛星雲圖
 */

// ========== 設定區域 ==========
const CONFIG = {
  // Line Bot 設定
  LINE_CHANNEL_ACCESS_TOKEN: '你的_LINE_CHANNEL_ACCESS_TOKEN',

  // OpenWeatherMap 設定 (https://openweathermap.org/api)
  OPENWEATHER_API_KEY: '你的_OPENWEATHER_API_KEY',

  // Stormglass 設定 (https://stormglass.io/)
  STORMGLASS_API_KEY: '你的_STORMGLASS_API_KEY',

  // Google Sheet 設定
  SHEET_ID: '你的_GOOGLE_SHEET_ID',
  LOG_SHEET_NAME: '查詢記錄',
  WEATHER_SHEET_NAME: '天氣資料',
  OCEAN_SHEET_NAME: '海洋資料',
  SESSION_SHEET_NAME: '使用者狀態'
};

// 預設地區選項
const LOCATIONS = {
  '1': { name: '台北', lat: 25.0330, lon: 121.5654 },
  '2': { name: '台中', lat: 24.1477, lon: 120.6736 },
  '3': { name: '高雄', lat: 22.6273, lon: 120.3014 },
  '4': { name: '花蓮', lat: 23.9871, lon: 121.6011 },
  '5': { name: '澎湖', lat: 23.5711, lon: 119.5793 },
  '6': { name: '金門', lat: 24.4893, lon: 118.3713 },
  '7': { name: '台東', lat: 22.7583, lon: 121.1444 },
  '8': { name: '墾丁', lat: 21.9500, lon: 120.8000 }
};

// ========== Line Bot Webhook 主程式 ==========

/**
 * 處理 Line Webhook POST 請求
 */
function doPost(e) {
  try {
    const events = JSON.parse(e.postData.contents).events;

    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        handleMessage(event);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logError('doPost', error);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GET 請求 (用於測試)
 */
function doGet(e) {
  return ContentService.createTextOutput('🛰️ 低軌衛星氣象 Line Bot 運作中！')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 處理使用者訊息 - 主要邏輯
 */
function handleMessage(event) {
  const userMessage = event.message.text.trim();
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  // 記錄查詢
  logQuery(userId, userMessage);

  // 取得使用者目前狀態
  const userState = getUserState(userId);

  let replyMessages = [];

  // 判斷輸入
  if (userMessage === '低軌衛星' || userMessage === '低歸衛星' || userMessage.toLowerCase() === 'menu') {
    // 顯示主選單
    replyMessages = getMainMenu();
    setUserState(userId, 'MAIN_MENU', null);
  }
  else if (userState.state === 'MAIN_MENU' && ['1', '2', '3', '4', '5'].includes(userMessage)) {
    // 使用者選擇了功能
    replyMessages = handleMainMenuSelection(userId, userMessage);
  }
  else if (userState.state === 'SELECT_LOCATION') {
    // 使用者選擇了地區
    replyMessages = handleLocationSelection(userId, userMessage, userState.action);
  }
  else if (userState.state === 'CUSTOM_INPUT') {
    // 使用者輸入自訂地點
    replyMessages = handleCustomInput(userId, userMessage, userState.action);
  }
  else if (userMessage === '取消' || userMessage === '返回') {
    // 返回主選單
    replyMessages = getMainMenu();
    setUserState(userId, 'MAIN_MENU', null);
  }
  else {
    // 未知指令，顯示提示
    replyMessages = getWelcomeMessage();
  }

  // 回覆訊息
  replyToLine(replyToken, replyMessages);
}

// ========== 選單系統 ==========

/**
 * 取得主選單
 */
function getMainMenu() {
  const text = `🛰️ 低軌衛星氣象資料系統
━━━━━━━━━━━━━━━━━━
請輸入數字選擇功能：

1️⃣  查詢天氣狀況
2️⃣  查詢海洋/洋流資料
3️⃣  取得衛星雲圖連結
4️⃣  查詢所有資料
5️⃣  顯示使用說明

━━━━━━━━━━━━━━━━━━
💡 輸入「取消」可隨時返回此選單`;

  return [{ type: 'text', text: text }];
}

/**
 * 取得歡迎訊息
 */
function getWelcomeMessage() {
  const text = `🛰️ 歡迎使用低軌衛星氣象系統！

請輸入【低軌衛星】開始使用

━━━━━━━━━━━━━━━━━━
可用指令：
• 低軌衛星 - 開啟主選單
• 取消 - 返回主選單`;

  return [{ type: 'text', text: text }];
}

/**
 * 取得地區選單
 */
function getLocationMenu(action) {
  const actionName = {
    'weather': '天氣',
    'ocean': '洋流',
    'all': '所有資料'
  }[action] || '資料';

  const text = `📍 請選擇要查詢${actionName}的地區：

1️⃣  台北
2️⃣  台中
3️⃣  高雄
4️⃣  花蓮
5️⃣  澎湖
6️⃣  金門
7️⃣  台東
8️⃣  墾丁
9️⃣  自行輸入地點

━━━━━━━━━━━━━━━━━━
💡 輸入數字選擇，或輸入「取消」返回`;

  return [{ type: 'text', text: text }];
}

/**
 * 處理主選單選擇
 */
function handleMainMenuSelection(userId, selection) {
  switch (selection) {
    case '1': // 天氣
      setUserState(userId, 'SELECT_LOCATION', 'weather');
      return getLocationMenu('weather');

    case '2': // 洋流
      setUserState(userId, 'SELECT_LOCATION', 'ocean');
      return getLocationMenu('ocean');

    case '3': // 衛星雲圖
      setUserState(userId, 'MAIN_MENU', null);
      return getSatelliteResponse();

    case '4': // 全部
      setUserState(userId, 'SELECT_LOCATION', 'all');
      return getLocationMenu('all');

    case '5': // 說明
      setUserState(userId, 'MAIN_MENU', null);
      return getHelpResponse();

    default:
      return getMainMenu();
  }
}

/**
 * 處理地區選擇
 */
function handleLocationSelection(userId, selection, action) {
  // 選擇 9：自行輸入地點
  if (selection === '9') {
    setUserState(userId, 'CUSTOM_INPUT', action);
    return [{
      type: 'text',
      text: `✏️ 請輸入要查詢的地點名稱

範例：
• 新竹
• 宜蘭
• Tokyo
• New York

━━━━━━━━━━━━━━━━━━
💡 輸入地點名稱，或輸入「取消」返回主選單`
    }];
  }

  const location = LOCATIONS[selection];

  if (!location) {
    return [{
      type: 'text',
      text: '❌ 無效的選項，請輸入 1-9 的數字，或輸入「取消」返回主選單'
    }];
  }

  // 重置狀態
  setUserState(userId, 'MAIN_MENU', null);

  // 根據 action 執行查詢
  switch (action) {
    case 'weather':
      return getWeatherResponse(location.lat, location.lon, location.name);

    case 'ocean':
      return getOceanResponse(location.lat, location.lon, location.name);

    case 'all':
      const weatherMsg = getWeatherResponse(location.lat, location.lon, location.name);
      const oceanMsg = getOceanResponse(location.lat, location.lon, location.name);
      const satelliteMsg = getSatelliteResponse();
      return [...weatherMsg, ...oceanMsg, ...satelliteMsg];

    default:
      return getMainMenu();
  }
}

/**
 * 處理自訂地點輸入
 */
function handleCustomInput(userId, locationName, action) {
  // 使用 OpenWeatherMap Geocoding API 取得座標
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationName)}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`;

  try {
    const response = UrlFetchApp.fetch(geoUrl);
    const data = JSON.parse(response.getContentText());

    if (!data || data.length === 0) {
      return [{
        type: 'text',
        text: `❌ 找不到「${locationName}」這個地點

請嘗試：
• 使用中文或英文城市名
• 檢查拼寫是否正確
• 或選擇預設地區

━━━━━━━━━━━━━━━━━━
💡 輸入「低軌衛星」返回主選單`
      }];
    }

    const lat = data[0].lat;
    const lon = data[0].lon;
    const name = data[0].local_names?.zh || data[0].name;

    // 重置狀態
    setUserState(userId, 'MAIN_MENU', null);

    // 根據 action 執行查詢
    switch (action) {
      case 'weather':
        return getWeatherResponse(lat, lon, name);

      case 'ocean':
        return getOceanResponse(lat, lon, name);

      case 'all':
        const weatherMsg = getWeatherResponse(lat, lon, name);
        const oceanMsg = getOceanResponse(lat, lon, name);
        const satelliteMsg = getSatelliteResponse();
        return [...weatherMsg, ...oceanMsg, ...satelliteMsg];

      default:
        return getMainMenu();
    }
  } catch (error) {
    logError('handleCustomInput', error);
    return [{
      type: 'text',
      text: `❌ 查詢「${locationName}」時發生錯誤，請稍後再試。

💡 輸入「低軌衛星」返回主選單`
    }];
  }
}

// ========== 使用者狀態管理 ==========

/**
 * 取得使用者狀態
 */
function getUserState(userId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SESSION_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SESSION_SHEET_NAME);
      sheet.appendRow(['使用者ID', '狀態', '動作', '更新時間']);
      return { state: 'NONE', action: null };
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // 檢查是否過期（30分鐘）
        const updateTime = new Date(data[i][3]);
        const now = new Date();
        if ((now - updateTime) > 30 * 60 * 1000) {
          return { state: 'NONE', action: null };
        }
        return { state: data[i][1], action: data[i][2] };
      }
    }

    return { state: 'NONE', action: null };
  } catch (error) {
    logError('getUserState', error);
    return { state: 'NONE', action: null };
  }
}

/**
 * 設定使用者狀態
 */
function setUserState(userId, state, action) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SESSION_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SESSION_SHEET_NAME);
      sheet.appendRow(['使用者ID', '狀態', '動作', '更新時間']);
    }

    const data = sheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.getRange(i + 1, 2).setValue(state);
        sheet.getRange(i + 1, 3).setValue(action || '');
        sheet.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([userId, state, action || '', new Date()]);
    }
  } catch (error) {
    logError('setUserState', error);
  }
}

// ========== 天氣 API (OpenWeatherMap) ==========

/**
 * 取得天氣資料
 */
function getWeatherData(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;

  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    // 儲存到 Google Sheet
    saveWeatherData(data);

    return {
      success: true,
      data: {
        location: data.name,
        description: data.weather[0].description,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDeg: data.wind.deg,
        clouds: data.clouds.all,
        visibility: data.visibility,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('zh-TW'),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('zh-TW')
      }
    };
  } catch (error) {
    logError('getWeatherData', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 產生天氣回覆訊息
 */
function getWeatherResponse(lat, lon, locationName) {
  const result = getWeatherData(lat, lon);

  if (!result.success) {
    return [{ type: 'text', text: '❌ 取得天氣資料失敗，請稍後再試。' }];
  }

  const d = result.data;
  const text = `🌤️ ${locationName} 天氣資訊
━━━━━━━━━━━━━━━━━━
🌡️ 溫度：${d.temperature}°C
🤔 體感：${d.feelsLike}°C
☁️ 天氣：${d.description}
💧 濕度：${d.humidity}%
🌬️ 風速：${d.windSpeed} m/s
🔭 能見度：${d.visibility}m
☁️ 雲量：${d.clouds}%
🌅 日出：${d.sunrise}
🌇 日落：${d.sunset}
━━━━━━━━━━━━━━━━━━
📡 資料來源：OpenWeatherMap
⏰ 更新時間：${new Date().toLocaleString('zh-TW')}

💡 輸入「低軌衛星」返回主選單`;

  return [{ type: 'text', text: text }];
}

// ========== 洋流/海洋 API (Stormglass) ==========

/**
 * 取得海洋資料
 */
function getOceanData(lat, lon) {
  const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lon}&params=waveHeight,wavePeriod,waveDirection,waterTemperature,currentSpeed,currentDirection,seaLevel`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': CONFIG.STORMGLASS_API_KEY
      }
    });
    const data = JSON.parse(response.getContentText());
    const current = data.hours[0];

    // 儲存到 Google Sheet
    saveOceanData(current);

    return {
      success: true,
      data: {
        waveHeight: current.waveHeight?.sg || 'N/A',
        wavePeriod: current.wavePeriod?.sg || 'N/A',
        waveDirection: current.waveDirection?.sg || 'N/A',
        waterTemperature: current.waterTemperature?.sg || 'N/A',
        currentSpeed: current.currentSpeed?.sg || 'N/A',
        currentDirection: current.currentDirection?.sg || 'N/A',
        seaLevel: current.seaLevel?.sg || 'N/A',
        time: current.time
      }
    };
  } catch (error) {
    logError('getOceanData', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 產生海洋回覆訊息
 */
function getOceanResponse(lat, lon, locationName) {
  const result = getOceanData(lat, lon);

  if (!result.success) {
    return [{
      type: 'text',
      text: `❌ 取得 ${locationName} 海洋資料失敗

可能原因：
• Stormglass 免費版每日限 10 次請求
• 網路連線問題

💡 輸入「低軌衛星」返回主選單`
    }];
  }

  const d = result.data;
  const text = `🌊 ${locationName} 海洋/洋流資訊
━━━━━━━━━━━━━━━━━━
🌊 浪高：${d.waveHeight} m
⏱️ 週期：${d.wavePeriod} s
➡️ 浪向：${d.waveDirection}°
🌡️ 水溫：${d.waterTemperature}°C
💨 洋流速度：${d.currentSpeed} m/s
🧭 洋流方向：${d.currentDirection}°
📊 海平面：${d.seaLevel} m
━━━━━━━━━━━━━━━━━━
📡 資料來源：Stormglass
⏰ 資料時間：${d.time}

💡 輸入「低軌衛星」返回主選單`;

  return [{ type: 'text', text: text }];
}

// ========== 衛星雲圖 ==========

/**
 * 產生衛星雲圖回覆訊息
 */
function getSatelliteResponse() {
  const text = `🛰️ 衛星雲圖連結
━━━━━━━━━━━━━━━━━━
以下是即時衛星雲圖：

📡 Windy 衛星雲圖（互動式）
👉 https://www.windy.com/satellite

📡 向日葵衛星（日本氣象廳）
👉 https://www.jma.go.jp/bosai/map.html#5/25/121/&elem=ir&contents=himawari

📡 Zoom Earth（全球衛星）
👉 https://zoom.earth/

📡 NASA Worldview
👉 https://worldview.earthdata.nasa.gov/

━━━━━━━━━━━━━━━━━━
⏰ 查詢時間：${new Date().toLocaleString('zh-TW')}

💡 輸入「低軌衛星」返回主選單`;

  return [{ type: 'text', text: text }];
}

// ========== 說明訊息 ==========

function getHelpResponse() {
  const text = `📖 使用說明
━━━━━━━━━━━━━━━━━━

【如何使用】
1️⃣ 輸入「低軌衛星」開啟選單
2️⃣ 輸入數字選擇功能
3️⃣ 選擇查詢地區（或自行輸入）
4️⃣ 系統回傳資料

【預設地區】
台北、台中、高雄、花蓮
澎湖、金門、台東、墾丁

【自訂地點】
選擇「9. 自行輸入」後
可輸入任何城市名稱查詢

【資料來源】
🌤️ 天氣：OpenWeatherMap
🌊 洋流：Stormglass
🛰️ 衛星：向日葵衛星/NASA

【注意事項】
• 洋流資料每日限 10 次查詢
• 衛星雲圖為外部連結
• 輸入「取消」可返回主選單

━━━━━━━━━━━━━━━━━━
💡 輸入「低軌衛星」返回主選單`;

  return [{ type: 'text', text: text }];
}

// ========== Line API 功能 ==========

/**
 * 回覆 Line 訊息
 */
function replyToLine(replyToken, messages) {
  const url = 'https://api.line.me/v2/bot/message/reply';

  const payload = {
    replyToken: replyToken,
    messages: messages.slice(0, 5)
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    logError('replyToLine', error);
  }
}

/**
 * 主動推送訊息
 */
function pushMessage(userId, messages) {
  const url = 'https://api.line.me/v2/bot/message/push';

  const payload = {
    to: userId,
    messages: messages
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    logError('pushMessage', error);
  }
}

// ========== Google Sheet 記錄功能 ==========

/**
 * 記錄查詢
 */
function logQuery(userId, query) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow(['時間戳記', '使用者ID', '查詢內容']);
    }

    sheet.appendRow([new Date(), userId, query]);
  } catch (error) {
    logError('logQuery', error);
  }
}

/**
 * 儲存天氣資料
 */
function saveWeatherData(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.WEATHER_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.WEATHER_SHEET_NAME);
      sheet.appendRow(['時間戳記', '位置', '溫度', '體感溫度', '濕度', '風速', '天氣描述']);
    }

    sheet.appendRow([
      new Date(),
      data.name,
      data.main.temp,
      data.main.feels_like,
      data.main.humidity,
      data.wind.speed,
      data.weather[0].description
    ]);
  } catch (error) {
    logError('saveWeatherData', error);
  }
}

/**
 * 儲存海洋資料
 */
function saveOceanData(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.OCEAN_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.OCEAN_SHEET_NAME);
      sheet.appendRow(['時間戳記', '浪高', '週期', '水溫', '洋流速度', '洋流方向']);
    }

    sheet.appendRow([
      new Date(),
      data.waveHeight?.sg || 'N/A',
      data.wavePeriod?.sg || 'N/A',
      data.waterTemperature?.sg || 'N/A',
      data.currentSpeed?.sg || 'N/A',
      data.currentDirection?.sg || 'N/A'
    ]);
  } catch (error) {
    logError('saveOceanData', error);
  }
}

/**
 * 記錄錯誤
 */
function logError(functionName, error) {
  console.error(`[${functionName}] ${error.toString()}`);

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName('錯誤記錄');

    if (!sheet) {
      sheet = ss.insertSheet('錯誤記錄');
      sheet.appendRow(['時間戳記', '函式名稱', '錯誤訊息']);
    }

    sheet.appendRow([new Date(), functionName, error.toString()]);
  } catch (e) {
    console.error('無法記錄錯誤到 Sheet');
  }
}

// ========== 測試函式 ==========

/**
 * 測試天氣 API
 */
function testWeatherAPI() {
  const result = getWeatherData(25.0330, 121.5654);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * 測試海洋 API
 */
function testOceanAPI() {
  const result = getOceanData(25.0330, 121.5654);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * 清除過期的使用者狀態
 */
function cleanupExpiredSessions() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SESSION_SHEET_NAME);

    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const rowsToDelete = [];

    for (let i = data.length - 1; i >= 1; i--) {
      const updateTime = new Date(data[i][3]);
      if ((now - updateTime) > 60 * 60 * 1000) { // 1小時
        rowsToDelete.push(i + 1);
      }
    }

    rowsToDelete.forEach(row => sheet.deleteRow(row));
  } catch (error) {
    logError('cleanupExpiredSessions', error);
  }
}
