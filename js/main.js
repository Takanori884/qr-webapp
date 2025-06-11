// js/main.js

// API エンドポイントの URL
const API_URL = localStorage.getItem('spreadsheetURL');

if (!API_URL) {
  console.warn("スプレッドシートURLが設定されていません。settings.htmlで設定してください。");
  alert("スプレッドシートのURLを先に設定してください。");
} else {
  loadMapping();
}

// JSONP用関数
function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now();
    params.callback = callbackName;
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    const script = document.createElement('script');
    script.src = `${url}?${query}`;
    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP リクエスト失敗'));
    };
    window[callbackName] = data => {
      resolve(data);
      delete window[callbackName];
      document.body.removeChild(script);
    };
    document.body.appendChild(script);
  });
}

// mapping.json 読み込み
function fetchName(qr) {
  const name = mapping[qr];
  console.log('fetchName lookup:', qr, '→', name);
  return name || '';
}

async function sendAction(qr, name, action) {
  try {
    await jsonp(API_URL, { qr, name, action });
  } catch (e) {
    console.error('ログ送信エラー:', e);
  }
}

// DOM取得
const videoElem       = document.getElementById('video');
const actionButtons   = document.getElementById('action-buttons');
const enterBtn        = document.getElementById('enter-btn');
const exitBtn         = document.getElementById('exit-btn');
const beepSound       = document.getElementById('beep-sound');
const cameraPrompt    = document.querySelector('.camera-prompt');
const overlayResult   = document.getElementById('overlay-result');

// canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 状態管理
let scanning = true;
let inactivityTimer = null;
let buttonTimer = null;
let lastQr = '';

// メッセージ制御
function updateCameraPrompt(text, duration = 0) {
  cameraPrompt.textContent = text;
  if (duration > 0) {
    setTimeout(() => {
      cameraPrompt.textContent = 'QRコードをカメラにかざしてください';
    }, duration);
  }
}

// オーバーレイ制御
function showOverlay(text, duration = 3000) {
  overlayResult.textContent = text;
  overlayResult.style.display = 'block';
  if (duration > 0) {
    setTimeout(() => {
      overlayResult.style.display = 'none';
    }, duration);
  }
}

// ボタン非表示
function hideResult() {
  actionButtons.style.display = 'none';
}

// スキャン再開
function scheduleRescan(delay) {
  clearTimeout(buttonTimer);
  buttonTimer = setTimeout(() => {
    hideResult();
    updateCameraPrompt('スキャンの準備ができました', 2000);
    scanning = true;
    resetInactivityTimer();
    requestAnimationFrame(scanLoop);
  }, delay);
}

// 自動戻りタイマー
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    window.location.href = 'index.html';
  }, 60000);
}

// スキャンループ
function scanLoop() {
  if (!scanning) return;
  if (videoElem.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return requestAnimationFrame(scanLoop);
  }
  canvas.width = videoElem.videoWidth;
  canvas.height = videoElem.videoHeight;
  ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (code && code.data) {
    lastQr = code.data;
    handleDetect(code.data);
  } else {
    requestAnimationFrame(scanLoop);
  }
}

// QR検出処理
async function handleDetect(qr) {
  console.log('読み取られた QR:', qr);
  scanning = false;
  clearTimeout(inactivityTimer);

  const name = await fetchName(qr);

  // ビープ音
  beepSound.src = 'sound/beep1.mp3';
  beepSound.currentTime = 0;
  beepSound.play().catch(() => {});

  if (!name) {
    updateCameraPrompt('未登録のコードです', 2000);
    showOverlay('未登録のコードです');
    hideResult();
    scheduleRescan(2000);
  } else {
    updateCameraPrompt('「入る」か「出る」を押してください');
    showOverlay(name);
    actionButtons.style.display = 'flex';
    scheduleRescan(5000);
  }
}

// ボタン押下処理
async function handleChoice(label) {
  clearTimeout(buttonTimer);
  clearTimeout(inactivityTimer);
  hideResult();

  beepSound.src = 'sound/beep2.mp3';
  beepSound.currentTime = 0;
  beepSound.play().catch(() => {});

  updateCameraPrompt('記録しています...');

  const actionCode = label === '入所' ? 1 : 0;
  await sendAction(lastQr, overlayResult.textContent, actionCode);

  updateCameraPrompt('スキャンの準備ができました', 2000);

  setTimeout(() => {
    scanning = true;
    resetInactivityTimer();
    requestAnimationFrame(scanLoop);
  }, 1000);
}

// カメラ開始
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 10, max: 10 }
      }
    });
    videoElem.srcObject = stream;
    videoElem.addEventListener('loadeddata', () => {
      resetInactivityTimer();
      requestAnimationFrame(scanLoop);
    });
  } catch (e) {
    console.error('カメラ起動エラー:', e);
    alert('カメラが起動できませんでした。');
  }
}

// イベント登録
enterBtn.addEventListener('click', () => handleChoice('入所'));
exitBtn.addEventListener('click', () => handleChoice('退所'));