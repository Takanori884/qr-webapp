// js/main.js

// HTML 要素の取得
const videoElem     = document.getElementById("video");
const resultDiv     = document.getElementById("result");
const resultText    = document.getElementById("result-text");
const actionButtons = document.getElementById("action-buttons");
const enterBtn      = document.getElementById("enter-btn");
const exitBtn       = document.getElementById("exit-btn");
const beepSound     = document.getElementById("beep-sound");

// 解析用 Canvas の生成
const canvas = document.createElement("canvas");
const ctx    = canvas.getContext("2d");

// 制御フラグとタイマー
let scanning = true;
let inactivityTimer = null;
let buttonTimer     = null;  // ボタン表示タイマー

/**
 * カメラを起動して映像ストリームを設定
 */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 10, max: 15 }
      }
    });
    videoElem.srcObject = stream;
    videoElem.addEventListener("loadeddata", () => {
      resetInactivityTimer();
      requestAnimationFrame(scanLoop);
    });
  } catch (err) {
    console.error("カメラ起動エラー:", err);
    alert("カメラを起動できませんでした。権限やデバイスを確認してください。");
  }
}

/**
 * フレームごとに QR コードをスキャン
 */
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
    handleDetect(code.data);
  } else {
    requestAnimationFrame(scanLoop);
  }
}

/**
 * QR コード検出時の処理
 */
function handleDetect(data) {
  clearTimeout(inactivityTimer);
  scanning = false;

  // 読み取り結果を表示
  resultText.textContent      = data;
  resultDiv.style.display     = "block";
  actionButtons.style.display = "flex";

  // ビープ音再生（QR 検出用）
  beepSound.src = "sound/beep1.mp3";
  beepSound.currentTime = 0;
  beepSound.play().catch(e => console.warn("音声再生失敗:", e));

  // 5秒後にボタン非表示・再スキャン
  clearTimeout(buttonTimer);
  buttonTimer = setTimeout(() => {
    resultDiv.style.display     = "none";
    actionButtons.style.display = "none";
    scanning = true;
    resetInactivityTimer();
    requestAnimationFrame(scanLoop);
  }, 5000);
}

/**
 * 入所/退所ボタン押下時の処理
 */
function handleChoice(action) {
  console.log(`${action} 処理実行`);

  // ビープ音再生（ボタン用）
  beepSound.src = "sound/beep2.mp3";
  beepSound.currentTime = 0;
  beepSound.play().catch(e => console.warn("音声再生失敗:", e));

  // ボタンタイマー解除
  clearTimeout(buttonTimer);

  // UI 非表示
  resultDiv.style.display     = "none";
  actionButtons.style.display = "none";

  // 1秒後に再スキャンを再開
  setTimeout(() => {
    scanning = true;
    resetInactivityTimer();
    requestAnimationFrame(scanLoop);
  }, 1000);
}

enterBtn.addEventListener("click", () => handleChoice("入所"));
exitBtn.addEventListener("click", () => handleChoice("退所"));

/**
 * 非アクティブ状態が30秒続いたらトップ画面に戻る
 */
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    window.location.href = "index.html";
  }, 30000);
}

// 初期化
window.addEventListener("DOMContentLoaded", startCamera);
