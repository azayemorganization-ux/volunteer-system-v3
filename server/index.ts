import app from "./app.js";

// تحديد البورت بشكل مرن ليتوافق مع Render عند الرفع
const port = Number(process.env.PORT || 5000);

// تشغيل السيرفر ليستقبل الطلبات من أي مكان "0.0.0.0" (شرط أساسي لبيئة الرندر)
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server is officially running on port ${port}`);
});

// معالجة أخطاء التشغيل المفاجئة لضمان عدم انهيار السيرفر
server.on("error", (err) => {
  console.error("❌ Critical: Server failed to start due to error:", err);
  process.exit(1);
});
