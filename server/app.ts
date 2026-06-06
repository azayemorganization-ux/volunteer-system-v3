import express from "express";
import cors from "cors";
import { getIronSession } from "iron-session";
import router from "./routes/index.js";
import { db } from "./db/index.js";

const app = express();

// ضروري جداً لـ Render و Vercel (خلف Proxy)
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📢 ميكروفون لطباعة أي طلب يوصل السيرفر وكشف حركات الفرونت إند
app.use((req, res, next) => {
  console.log(`📢 [${req.method}] ووصل طلب على الرابط: ${req.url}`);
  next();
});

const allowedOrigin = process.env.FRONTEND_URL || "https://volunteer-system-v3.vercel.app";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.options("*", cors());

app.use(async (req, res, next) => {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("❌ خطأ: SESSION_SECRET يجب أن يكون 32 حرفاً على الأقل");
  }

  const sessionOptions = {
    cookieName: "srcs_volunteer_session",
    password: sessionSecret || "a_very_long_secure_password_32_characters_long",
    ttl: 60 * 60 * 24 * 7,
    cookieOptions: {
      // إذا كنت في برودكشن، اجبرها تكون secure
      secure: process.env.NODE_ENV === "production", 
      sameSite: "none",
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


// 🛑 🛑 🛑 [بوابة قفل الموقع والسرداب السري] 🛑 🛑 🛑

const IS_MAINTENANCE = true; // 👈 خليها true عشان تقفل السيرفر، ولما تنتهي رجعها false
const SECRET_KEY = "jabal";    // 🤫 الكلمة السرية بتاعت السرداب الخص بك

app.use((req, res, next) => {
  // 1. لو وضع الصيانة واقف (false)، مشّي الناس طبيعي
  if (!IS_MAINTENANCE) return next(); 

  // 2. السماح بروابط النظام الأساسية عشان السيرفر ما يقع في ريندر
  if (req.url === "/" || req.url === "/api/health") return next();

  // 3. 🤫 السرداب السري: لو أنت ضفت الكلمة السرية في نهاية أي رابط، السيرفر حيفتح ليك ليك أنت بس!
  if (req.query.secret === SECRET_KEY) {
    return next();
  }

  // 4. قفل السيرفر عن أي متطوع تاني وإرجاع رسالة الصيانة
  return res.status(503).json({
    maintenance: true,
    message: "⚠️ النظام تحت الصيانة والتحديث المؤقت الآن.. سيعود العمل قريباً جداً يا أبطال."
  });
});

// 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑


app.use("/api", router);

app.get("/api/health", async (_req, res) => {
  res.status(200).json({
    status: "UP",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (_req, res) => {
  res.send("SRCS Volunteer System API is running successfully.");
});

export default app;
