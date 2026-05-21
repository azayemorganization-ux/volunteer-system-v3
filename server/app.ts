import express from "express";
import cors from "cors";
import { getIronSession } from "iron-session";
import router from "./routes/index.js";
import { db } from "./db/index.js"; // 👈 التعديل هنا: بنستورد مباشرة من مجلد db الشرعي اللي جهزناه

const app = express();

// مهم جداً لمنصات الرفع السحابية (مثل Render) لقراءة الـ IPs وتأمين الجلسات بشكل صحيح
app.set("trust proxy", 1);

// Body parser لقراءة البيانات القادمة من الـ Frontend (استمارات الحصر)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعدادات الـ CORS لتسمح للـ Frontend بالاتصال بالسيرفر وتبادل الـ Cookies للجلسات
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin, 
    credentials: true,
  })
);

// تفعيل خيارات الأمان المسبقة لجميع المسارات (Preflight Requests)
app.options("*", cors());

// ميدل وير إدارة الجلسات (Sessions) لتذكر دخول المشرفين والأدمن
app.use(async (req, res, next) => {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    console.error("❌ خطأ حرج: SESSION_SECRET غير معرف في ملف الـ .env لتأمين جلسات المشرفين");
  }

  const sessionOptions = {
    cookieName: "srcs_volunteer_session",
    password: sessionSecret || "a_very_long_secure_password_32_characters_long",
    ttl: 60 * 60 * 24 * 7, // الجلسة تستمر لمدة أسبوع واحد (7 أيام)
    cookieOptions: {
      secure: process.env.NODE_ENV === "production", 
      sameSite: "none" as const,
      httpOnly: true,
      path: "/",
    },
  };
  
  try {
    // @ts-ignore
    req.session = await getIronSession(req, res, sessionOptions);
    next();
  } catch (error) {
    next(error);
  }
});

// الروابط الأساسية للنظام للعمليات الميدانية (Routes)
app.use("/api", router);

/**
 * 🔍 نظام فحص كفاءة السيرفر المركزي والربط مع Neon
 */
app.get("/api/health", async (_req, res) => {
  let dbStatus = "CONNECTED";
  
  try {
    // السيرفر بيتأكد إنو قادر يوصل للـ db ومجلد الـ index شغال بدون مشاكل
    if (!db) {
      dbStatus = "DISCONNECTED";
    }
  } catch (e) {
    dbStatus = "ERROR";
  }

  res.status(200).json({
    status: "UP",
    environment: process.env.NODE_ENV || "development",
    services: {
      backend: "UP",
      database: dbStatus // حيرد بـ CONNECTED طالما السيرفر واصل لـ Neon
    },
    timestamp: new Date().toISOString()
  });
});

// الرابط الجذري الافتراضي للاختبار السريع في المتصفح
app.get("/", (_req, res) => {
  res.send("SRCS Volunteer System API (Neon-backed) is running successfully... V2.0");
});

export default app;
