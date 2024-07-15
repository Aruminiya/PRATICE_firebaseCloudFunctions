/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/* 官方提供的範例
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

Create and deploy your first functions
https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
*/

// 引入 Firebase Functions 和 Storage 模組
/* `onObjectFinalized` 是一個 Firebase Cloud Function 觸發器，
當有新文件上傳到 Firebase Storage 並完成時（即文件已經完全上傳並可供使用），這個觸發器會被觸發 */
const {onObjectFinalized} = require("firebase-functions/v2/storage");

/* `getStorage` 用於獲取 Firebase Storage 的實例，
這樣我們可以對 Storage 中的文件進行操作，例如下載、上傳和刪除文件 */
const {getStorage} = require("firebase-admin/storage");

/* `logger` 用於記錄日誌信息，這些日誌信息可以在 Firebase 控制台中查看，方便我們進行調試和監控 */
const logger = require("firebase-functions/logger");

/* `path` 模組提供了處理和轉換文件路徑的實用工具，例如獲取文件名、擴展名、目錄名等 */
const path = require("path");

// 用於圖片縮放的庫
const sharp = require("sharp");

// 初始化 Firebase Admin SDK
const admin = require("firebase-admin");
admin.initializeApp();

/* onObjectFinalized` 是 Firebase Cloud Functions 中的一個觸發器，
用於監聽 Google Cloud Storage 中的對象（文件）創建或覆蓋事件。
當一個文件在指定的存儲桶中被創建或覆蓋時，這個觸發器會被觸發，從而執行你定義的函數。 */

/* {cpu: 2}` 是在定義 Firebase Cloud Function 的配置選項時用來指定該函數所需的 CPU 資源。
具體來說，它表示這個 Cloud Function 需要 2 個虛擬 CPU 來運行。 */
exports.generateThumbnail = onObjectFinalized({cpu: 2}, async (event) => {
  // 這裡是你的處理邏輯
  const fileBucket = event.data.bucket; // 包含文件的存儲桶
  const filePath = event.data.name; // 存儲桶中的文件路徑
  const contentType = event.data.contentType; // 文件的內容類型

  // 你的處理邏輯，例如下載文件、處理文件、上傳結果等
  // 如果觸發的文件不是圖片，則退出
  if (!contentType.startsWith("image/")) {
    return logger.log("這不是一張圖片。");
  }
  // 如果圖片已經是縮略圖，則退出
  const fileName = path.basename(filePath);
  if (fileName.startsWith("thumb_")) {
    return logger.log("已經是縮略圖。");
  }

  // 從存儲桶中下載文件到內存中
  const bucket = getStorage().bucket(fileBucket);
  const downloadResponse = await bucket.file(filePath).download();
  const imageBuffer = downloadResponse[0];
  logger.log("圖片已下載！");

  // 使用 sharp 生成縮略圖
  const thumbnailBuffer = await sharp(imageBuffer).resize({
    width: 200,
    height: 200,
    withoutEnlargement: true,
  }).toBuffer();
  logger.log("縮略圖已創建");

  // 在文件名之前加上 'thumb_' 前綴
  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);

  // 上傳縮略圖
  const metadata = {contentType: contentType};
  await bucket.file(thumbFilePath).save(thumbnailBuffer, {
    metadata: metadata,
  });
  return logger.log("縮略圖已上傳！");
});
