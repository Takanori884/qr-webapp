// js/main.js

// API エンドポイントの URL（Apps Script ウェブアプリのもの）
const API_URL = 'https://script.google.com/macros/s/AKfycby-RoIjRko6kX5RZL6vorcokQBVlsdoo96WWMQbPo8JtHFvkhXw81Z7AnBK9iuQYDmF/exec';

// JSONP 用ヘルパー関数
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

// QR コードから氏名を取得
async function fetchName(qr) {
  try {
    const res = await jsonp(API_URL, { qr });
    return res.name || '';
  } catch (e) {
    console.error('名前取得エラー:', e);
    return '';
  }
}

// QR コード・氏名・アクションをログに記録
async function sendAction(qr, name, action) {
  try {
    await jsonp(API_URL, { qr, name, action });
  } catch (e) {
    console.error('ログ送信エラー:', e);
  }
}

// 要素取得
const videoElem     = document.getElementById('video');
const resultDiv     = document.getElementById('result');
const resultText    = document.getElementById('result-text');
const actionButtons = document.getElementById('action-buttons');
const enterBtn      = document.getElementById('enter-btn');
const exitBtn       = document.getElementById('exit-btn');
const beepSound     = document.getElementById('beep-sound');

// Canvas準備
const canvas = document.createElement('canvas');
const ctx    = canvas.getContext('2d');

// フラグ・タイマー
let scanning = true;
let inactivityTimer = null;
let buttonTimer     = null;
let lastQr          = '';  // 最新のQR値を保持

// UI制御関数
function showResult(text, showButtons) {
  resultText.textContent      = text;
  resultText.dataset.qr       = lastQr;
  resultDiv.style.display     = 'block';
  actionButtons.style.display = showButtons ? 'flex' : 'none';
}
function hideResult() {
  resultDiv.style.display     = 'none';
  actionButtons.style.display = 'none';
}
function scheduleRescan(delay) {
  clearTimeout(buttonTimer);
  buttonTimer = setTimeout(() => {
    hideResult();
    scanning = true;
    resetInactivityTimer();
    requestAnimationFrame(scanLoop);
  }, delay);
}
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    window.location.href = 'index.html';
  }, 60000);
}

// QRスキャンループ
function scanLoop() {
  if (!scanning) return;
  if (videoElem.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return requestAnimationFrame(scanLoop);
  }
  canvas.width  = videoElem.videoWidth;
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

// QR検出時の処理
async function handleDetect(qr) {
  clearTimeout(inactivityTimer);
  scanning = false;

  showResult('読み込み中…', false);

  // 検出ビープ
  beepSound.src = 'sound/beep1.mp3';
  beepSound.currentTime = 0;
  beepSound.play().catch(() => {});

  // 氏名取得
  const name = await fetchName(qr);

  if (!name) {
    showResult('未登録のコードです', false);
    scheduleRescan(2000);
  } else {
    showResult(name, true);
    scheduleRescan(5000);
  }
}

// 入退所ボタン押下時の処理
async function handleChoice(label) {
  clearTimeout(buttonTimer);
  clearTimeout(inactivityTimer);
  hideResult();

  // ボタンビープ
  beepSound.src = 'sound/beep2.mp3';
  beepSound.currentTime = 0;
  beepSound.play().catch(() => {});

  // ログ送信
  const actionCode = label === '入所' ? 1 : 0;
  await sendAction(lastQr, resultText.textContent, actionCode);

  // 再スキャン予約
  scheduleRescan(1000);
}

// カメラ起動
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width:       { ideal: 640 },
        height:      { ideal: 480 },
        frameRate:   { ideal: 10, max: 10 }
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
exitBtn.addEventListener('click',  () => handleChoice('退所'));
window.addEventListener('DOMContentLoaded', startCamera);