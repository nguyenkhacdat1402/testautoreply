// server.js
// Bot tự động trả lời tin nhắn Facebook Page qua Messenger Platform
// Chạy: node server.js (cần Node.js >= 18)

const express = require("express");
const app = express();
app.use(express.json());

// ====== CẤU HÌNH ======
// Lấy từ biến môi trường (Environment Variables) cấu hình trên Render/Railway.
// Khi chạy local để test, có thể tạo file .env hoặc set tạm bằng: VERIFY_TOKEN=xxx PAGE_ACCESS_TOKEN=yyy node server.js
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "testautoreplyfacebook";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

if (!PAGE_ACCESS_TOKEN) {
  console.warn("⚠️  CẢNH BÁO: chưa cấu hình PAGE_ACCESS_TOKEN — bot sẽ không gửi được tin nhắn!");
}

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
  console.log("📩 Nhận POST /webhook:", JSON.stringify(req.body));
  const body = req.body;

  if (body.object === "page") {
    // Trả 200 ngay để Facebook không retry
    res.status(200).send("EVENT_RECEIVED");

    for (const entry of body.entry) {
      const webhookEvent = entry.messaging?.[0];
      if (!webhookEvent) {
        console.log("⚠️ Không tìm thấy entry.messaging — có thể entry dùng field khác (vd: changes)");
        continue;
      }

      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message && !webhookEvent.message.is_echo) {
        const messageText = webhookEvent.message.text || "";
        console.log(`💬 Tin nhắn từ ${senderId}: "${messageText}"`);
        await handleMessage(senderId, messageText);
      } else if (webhookEvent.postback) {
        await handlePostback(senderId, webhookEvent.postback);
      }
    }
  } else {
    console.log("⚠️ body.object không phải 'page':", body.object);
    res.sendStatus(404);
  }
});

// ====== 3. BỘ CÂU HỎI - CÂU TRẢ LỜI ======
// Mỗi rule: match khi tin nhắn chứa ĐỦ tất cả các nhóm từ khóa trong "all",
// và (nếu có "any") chứa ÍT NHẤT MỘT từ trong "any".
// Rule đặt CÀNG CỤ THỂ càng nên để LÊN TRÊN, vì bot chọn rule khớp đầu tiên.
const QA_RULES = [
  {
    all: ["căn cước"],
    reply:
      "Xin chào, mời bạn đến Bộ phận một cửa Công an xã Quỳnh Lưu – cơ sở 1 (địa chỉ: Thôn 2 Quỳnh Hồng, xã Quỳnh Lưu) để thu nhận hồ sơ cấp căn cước.\n\n" +
      "Thời gian từ thứ 2 đến thứ 7 hàng tuần (buổi sáng từ 7h30 đến 12h, buổi chiều từ 13h30 đến 17h).",
  },
  {
    all: ["định danh"],
    any: ["mức 2", "mức độ 2"],
    reply:
      "Xin chào, mời bạn đến Bộ phận một cửa Công an xã Quỳnh Anh – cơ sở 2 (địa chỉ: Thôn 2 Quỳnh Bảng, xã Quỳnh Anh) để thu nhận hồ sơ định danh điện tử mức 2.\n\n" +
      "Giấy tờ cần mang theo gồm: Căn cước công dân, thẻ bảo hiểm y tế, giấy phép lái xe...\n\n" +
      "Thời gian từ thứ 2 đến thứ 7 hàng tuần (buổi sáng từ 7h30 đến 12h, buổi chiều từ 13h30 đến 17h).",
  },
  {
    all: ["nhập khẩu"],
    any: ["con", "trẻ", "mới sinh", "con mới sinh"],
    reply:
      "Thủ tục nhập khẩu cho con mới sinh:\n\n" +
      "Quy định và thời hạn:\n" +
      "- Thời hạn: bắt buộc thực hiện trong vòng 60 ngày kể từ ngày có giấy khai sinh.\n" +
      "- Thời gian giải quyết: tối đa từ 3–5 ngày làm việc cho cả quy trình liên thông.\n" +
      "- Địa chỉ nộp trực tiếp (nếu cần): Công an xã nơi cha mẹ thường trú.\n\n" +
      "Các bước thực hiện online qua VNeID hoặc Cổng Dịch vụ công:\n" +
      "1. Đăng nhập tài khoản định danh điện tử mức 2 trên VNeID hoặc Cổng dịch vụ công quốc gia.\n" +
      "2. Chọn mục Dịch vụ công liên thông về đăng ký khai sinh, đăng ký thường trú, cấp thẻ bảo hiểm y tế cho trẻ dưới 6 tuổi.\n" +
      "3. Điền đầy đủ thông tin theo tờ khai điện tử sẵn có.\n" +
      "4. Đính kèm hình ảnh/bản scan Giấy khai sinh, Giấy chứng sinh điện tử từ cơ sở y tế.\n" +
      "5. Gửi hồ sơ và chờ kết quả phê duyệt trả về qua tin nhắn hoặc ứng dụng.",
  },
  {
    all: ["tách hộ"],
    reply:
      "Thủ tục tách hộ theo Luật Cư trú:\n\n" +
      "Hồ sơ cần chuẩn bị:\n" +
      "- Tờ khai thay đổi thông tin cư trú (Mẫu CT01), ghi rõ ý kiến đồng ý cho tách hộ của chủ hộ hoặc chủ sở hữu chỗ ở hợp pháp (trừ trường hợp đã có văn bản đồng ý riêng).\n" +
      "- Trường hợp vợ/chồng đã ly hôn nhưng vẫn ở chung chỗ ở hợp pháp: cần thêm giấy tờ chứng minh ly hôn và giấy tờ tiếp tục được sử dụng chỗ ở đó.\n\n" +
      "Cách thực hiện:\n" +
      "- Cách 1 (Trực tiếp): mang hồ sơ đến nộp tại Công an cấp xã/phường nơi cư trú.\n" +
      "- Cách 2 (Trực tuyến): đăng nhập VNeID hoặc Cổng dịch vụ công quốc gia, chọn thủ tục \"Tách hộ\", điền thông tin và đính kèm giấy tờ theo mẫu điện tử.\n\n" +
      "Thời gian giải quyết: 05 ngày làm việc. Lệ phí: 10.000đ (nộp trực tiếp) hoặc 5.000đ (nộp online).",
  },
  {
    all: ["đăng ký"],
    any: ["xe mới", "lần đầu", "xe lần đầu"],
    reply:
      "Đăng ký xe lần đầu (xe mới):\n\n" +
      "Hồ sơ cần chuẩn bị: Chứng nhận nguồn gốc xe, chứng từ chuyển sở hữu xe, chứng từ hoàn thành nghĩa vụ tài chính, và tài khoản định danh điện tử mức 2.\n\n" +
      "Thực hiện đăng ký trực tuyến toàn trình trên Cổng Dịch vụ công Bộ Công an hoặc ứng dụng VNeID:\n" +
      "https://dichvucong.bocongan.gov.vn/bocongan/bothutuc/tthc?matt=56952",
  },
  {
    all: ["sang tên"],
    reply:
      "Đăng ký sang tên xe:\n\n" +
      "Thực hiện trực tuyến một phần trên Cổng Dịch vụ công Bộ Công an, sau đó đến trực tiếp cơ quan đăng ký xe để hoàn tất.\n" +
      "Bạn có thể tra cứu thủ tục tại: https://dichvucong.bocongan.gov.vn",
  },
  {
    all: ["xin chào"],
    any: ["xin chào", "hi", "hello"],
    reply: "Xin chào! Bộ phận một cửa xin hỗ trợ bạn. Bạn cần hỏi về thủ tục gì ạ? (căn cước, định danh điện tử, nhập khẩu, tách hộ, đăng ký xe...)",
  },
];

// ====== 4. LOGIC TRẢ LỜI TỰ ĐỘNG ======
async function handleMessage(senderId, text) {
  const lower = text.toLowerCase().trim();

  const matchedRule = QA_RULES.find((rule) => {
    const matchesAll = rule.all.every((kw) => lower.includes(kw));
    const matchesAny = !rule.any || rule.any.some((kw) => lower.includes(kw));
    return matchesAll && matchesAny;
  });

  const reply = matchedRule
    ? matchedRule.reply
    : "Cảm ơn bạn đã nhắn tin! Hiện câu hỏi của bạn cần cán bộ trực tiếp hỗ trợ. Vui lòng để lại thông tin, chúng tôi sẽ phản hồi sớm nhất, hoặc liên hệ trực tiếp Bộ phận một cửa trong giờ hành chính.";

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
      console.error("❌ Lỗi gửi tin nhắn từ Graph API:", JSON.stringify(data.error));
    } else {
      console.log("✅ Gửi tin nhắn thành công:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối Graph API:", err);
  }
}

app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
});