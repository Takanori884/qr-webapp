// js/main.js

const videoElem  = document.getElementById("video");
const resultDiv  = document.getElementById("result");
const resultText = document.getElementById("result-text");
const enterBtn   = document.getElementById("enter-btn");
const exitBtn    = document.getElementById("exit-btn");
const beepSound  = document.getElementById("beep-sound");

// BarcodeDetector API の対応可否チェック
const formats  = ["qr_code"];
let detector    = ("BarcodeDetector" in window)
  ? new BarcodeDetector({ formats })
  : null;

// 解析用 Canvas をメモリ上に生成
const canvas = document.createElement("canvas");
const ctx    = canvas.getContext("2d");

// スキャン制御フラグ
let scanning = true;
// 非アクティブタイマー
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
  if (videoElem.readyState !== 4) { // HAVE_ENOUGH_DATA
    requestAnimationFrame(scanLoop);
    return;
  }
  canvas.width  = videoElem.videoWidth;
  canvas.height = videoElem.videoHeight;
  ctx.drawImage(videoElem, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (detector) {
    detector.detect(imageData)
      .then(barcodes => {
        if (barcodes.length) handleDetect(barcodes[0].rawValue);
        else requestAnimationFrame(scanLoop);
      })
      .catch(err => {
        console.error("BarcodeDetector エラー:", err);
        requestAnimationFrame(scanLoop);
      });
  } else {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) handleDetect(code.data);
    else requestAnimationFrame(scanLoop);
  }
}

// 検出時処理
function handleDetect(data) {
  clearTimeout(inactivityTimer);
  scanning = false;
  resultText.textContent = data;
  resultDiv.style.display = "block";
  enterBtn.style.display  = "inline-block";
  exitBtn.style.display   = "inline-block";

  // ビープ音
  beepSound.currentTime = 0;
  beepSound.play().catch(e => console.warn("音声再生失敗:", e));
}

// 入所・退所ボタン処理
function handleChoice(action) {
  console.log(`${action} の処理を実行`);
  beepSound.currentTime = 0;
  beepSound.play();
  // ボタン非表示
  enterBtn.style.display = exitBtn.style.display = "none";
  // 10秒後に再スキャン
  setTimeout(() => {
    resultDiv.style.display = "none";
    resultText.textContent = "";
    scanning = true;
    resetInactivityTimer();
    scanLoop();
  }, 10000);
}

enterBtn.addEventListener("click", () => handleChoice("入所"));
exitBtn.addEventListener("click", () => handleChoice("退所"));

// 非アクティブタイマーリセット
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    window.location.href = "index.html";
  }, 60 * 1000);
}

// 初期化
window.addEventListener("DOMContentLoaded", startCamera);
