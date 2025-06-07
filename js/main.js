// js/main.js

// HTML要素取得
const videoElem      = document.getElementById("video");
const resultDiv      = document.getElementById("result");
const resultText     = document.getElementById("result-text");
const actionButtons  = document.getElementById("action-buttons");
const enterBtn       = document.getElementById("enter-btn");
const exitBtn        = document.getElementById("exit-btn");
const beepSound      = document.getElementById("beep-sound");

// BarcodeDetector API 対応チェック
const formats  = ["qr_code"];
const detector = ("BarcodeDetector" in window)
  ? new BarcodeDetector({ formats })
  : null;

// Canvas生成
const canvas = document.createElement("canvas");
const ctx    = canvas.getContext("2d");

// フラグ・タイマー
let scanning = true;
let inactivityTimer = null;

// カメラ起動
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" } }
    });
    videoElem.srcObject = stream;
    videoElem.addEventListener("loadeddata", () => {
      resetInactivityTimer();
      scanLoop();
    });
  } catch (err) {
    console.error("カメラ起動エラー:", err);
    alert("カメラを起動できませんでした。権限やデバイスを確認してください。");
  }
}

// スキャンループ
function scanLoop() {
  if (!scanning) return;
  if (videoElem.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return requestAnimationFrame(scanLoop);
  }
  canvas.width  = videoElem.videoWidth;
  canvas.height = videoElem.videoHeight;
  ctx.drawImage(videoElem, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (detector) {
    detector.detect(imageData)
      .then(barcodes => {
        if (barcodes.length) {
          handleDetect(barcodes[0].rawValue);
        } else {
          requestAnimationFrame(scanLoop);
        }
      })
      .catch(err => {
        console.error("BarcodeDetector エラー:", err);
        requestAnimationFrame(scanLoop);
      });
  } else {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      handleDetect(code.data);
    } else {
      requestAnimationFrame(scanLoop);
    }
  }
}

// 読み取り成功時処理
function handleDetect(data) {
  clearTimeout(inactivityTimer);
  scanning = false;
  resultText.textContent = data;
  resultDiv.style.display = "block";
  actionButtons.style.display = "flex";

  // ビープ音再生
  beepSound.currentTime = 0;
  beepSound.play().catch(e => console.warn("音声再生失敗:", e));
}

// 入所・退所ボタン処理
function handleChoice(action) {
  console.log(`${action} 処理開始`);
  beepSound.currentTime = 0;
  beepSound.play();

  // 表示リセット
  actionButtons.style.display = "none";
  resultDiv.style.display   = "none";

  // 10秒後に再スキャン
  setTimeout(() => {
    scanning = true;
    resetInactivityTimer();
    scanLoop();
  }, 10000);
}

enterBtn.addEventListener("click", () => handleChoice("入所"));
exitBtn.addEventListener("click", () => handleChoice("退所"));

// 非アクティブタイマー設定
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    window.location.href = "index.html";
  }, 60000);
}

// 初期化
window.addEventListener("DOMContentLoaded", startCamera);
