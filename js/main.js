// js/main.js

// HTML 要素の取得
const videoElem  = document.getElementById("video");
const resultDiv  = document.getElementById("result");
const resultText = document.getElementById("result-text");
const resumeBtn  = document.getElementById("resume-btn");
const beepSound  = document.getElementById("beep-sound");

// BarcodeDetector API の対応可否チェック
const formats = ["qr_code"];
let detector = ("BarcodeDetector" in window)
  ? new BarcodeDetector({ formats })
  : null;

// 解析用 Canvas をメモリ上に生成
const canvas = document.createElement("canvas");
const ctx    = canvas.getContext("2d");

// スキャン制御フラグ
let scanning = true;

/**
 * カメラを起動して videoElem にストリームを流す
 */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } }
    });
    videoElem.srcObject = stream;
    videoElem.addEventListener("loadeddata", scanLoop);
  } catch (err) {
    console.error("カメラ起動エラー:", err);
    alert("カメラを起動できませんでした。権限やデバイスを確認してください。");
  }
}

/**
 * 1フレームずつ QR をスキャンするループ
 */
function scanLoop() {
  if (!scanning) return;

  if (videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
    // Canvas サイズを video と合わせる
    canvas.width  = videoElem.videoWidth;
    canvas.height = videoElem.videoHeight;
    ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (detector) {
      // ネイティブ API で検出
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
      // jsQR で検出
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleDetect(code.data);
      } else {
        requestAnimationFrame(scanLoop);
      }
    }
  } else {
    requestAnimationFrame(scanLoop);
  }
}

/**
 * 検出時の処理：結果を表示し、スキャンを一時停止＆ビープ音再生
 */
function handleDetect(data) {
  scanning = false;
  resultText.textContent = data;
  resultDiv.style.display = "block";

  // ビープ音を鳴らす
  beepSound.currentTime = 0;
  beepSound.play().catch(err => console.warn("音声再生失敗:", err));
}

/**
 * 「再開」ボタンでスキャンを再開
 */
resumeBtn.addEventListener("click", () => {
  resultDiv.style.display   = "none";
  resultText.textContent    = "";
  scanning                  = true;
  requestAnimationFrame(scanLoop);
});

// ページ読み込み後にカメラ起動
window.addEventListener("DOMContentLoaded", startCamera);
