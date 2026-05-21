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
