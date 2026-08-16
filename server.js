// server.js
// Bot tự động trả lời tin nhắn Facebook Page qua Messenger Platform
// Chạy: node server.js (cần Node.js >= 18)

const express = require("express");
const app = express();
app.use(express.json());

// ====== CẤU HÌNH — thay bằng giá trị thật của bạn ======
const VERIFY_TOKEN = "testautoreplyfacebook";       // Phải khớp với ô "Verify Token" trên Facebook App
const PAGE_ACCESS_TOKEN = "https://testautoreply.onrender.com/"; // Lấy ở bước 3 trong hướng dẫn
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.json("Bot tự động trả lời tin nhắn Facebook Page qua Messenger Platform");
});
// ====== 1. XÁC MINH WEBHOOK (Facebook gọi GET khi bạn bấm "Verify and Save") ======
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ====== 2. NHẬN SỰ KIỆN TIN NHẮN (Facebook gọi POST mỗi khi có tin nhắn mới) ======
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    // Trả 200 ngay để Facebook không retry
    res.status(200).send("EVENT_RECEIVED");

    for (const entry of body.entry) {
      const webhookEvent = entry.messaging?.[0];
      if (!webhookEvent) continue;

      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message && !webhookEvent.message.is_echo) {
        const messageText = webhookEvent.message.text || "";
        await handleMessage(senderId, messageText);
      } else if (webhookEvent.postback) {
        await handlePostback(senderId, webhookEvent.postback);
      }
    }
  } else {
    res.sendStatus(404);
  }
});

// ====== 3. LOGIC TRẢ LỜI TỰ ĐỘNG ======
async function handleMessage(senderId, text) {
  const lower = text.toLowerCase().trim();
  let reply;

  // --- Trả lời theo từ khóa (rule-based) ---
  if (lower.includes("giá") || lower.includes("bao nhiêu")) {
    reply = "Cảm ơn bạn đã quan tâm! Bạn có thể xem bảng giá tại website: https://vidu.com/gia hoặc để lại số điện thoại, shop sẽ liên hệ ngay.";
  } else if (lower.includes("giờ") && lower.includes("mở")) {
    reply = "Shop mở cửa từ 8h00 - 21h00 tất cả các ngày trong tuần ạ!";
  } else if (lower.includes("xin chào") || lower.includes("hi") || lower.includes("hello")) {
    reply = "Xin chào! Shop có thể giúp gì cho bạn? 😊";
  } else {
    reply = "Cảm ơn bạn đã nhắn tin! Nhân viên sẽ phản hồi bạn trong ít phút. Nếu cần gấp, vui lòng để lại số điện thoại nhé.";
  }

  await sendMessage(senderId, reply);
}

async function handlePostback(senderId, postback) {
  await sendMessage(senderId, `Bạn vừa bấm: ${postback.title}`);
}

// ====== 4. GỬI TIN NHẮN QUA GRAPH API ======
async function sendMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const payload = {
    recipient: { id: recipientId },
    message: { text },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.error) {
      console.error("Lỗi gửi tin nhắn:", data.error);
    }
  } catch (err) {
    console.error("Lỗi kết nối Graph API:", err);
  }
}

app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
});
