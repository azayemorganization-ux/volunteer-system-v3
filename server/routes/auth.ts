import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; 

const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

const router = Router();

// ---------------- 1️⃣ تسجيل الدخول (LOGIN) ----------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log(`📢 [HIT] محاولة تسجيل دخول جديدة للحساب: [${username}]`);

  if (!username || !password) {
    console.log("⚠️ [LOGIN FAILED] اسم المستخدم أو كلمة المرور فارغة");
    res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
    return;
  }

  // أولاً: التحقق إذا كان الحساب هو الأدمن الرئيسي (أنت)
  const hardcoded = SUPERADMINS[username];
  if (hardcoded && String(hardcoded.password) === String(password).trim()) {
    // @ts-ignore
    req.session.admin = {
      username,
      role: hardcoded.role,
      assignedUnits: null,
    };

    try {
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      console.log(`✅ [SUCCESS] تم دخول الأدمن الرئيسي [${username}] بنجاح.`);
      res.json({ success: true, role: hardcoded.role, username });
      return;
    } catch (saveErr) {
      console.error("💥 [SESSION SAVE ERROR]:", saveErr);
      res.status(500).json({ error: "حدث خطأ أثناء حفظ جلسة الدخول" });
      return;
    }
  }

  // ثانياً: التحقق من المشرفين الآخرين مع حماية ضد التعليق الصامت
  try {
    console.log(`🔍 [DATABASE CHECK] جاري البحث عن المشرف الفرعي [${username}] في جدول sub_admins...`);
    
    // سباق وقت: لو الداتابيز خدت أكتر من 4 ثواني، اقطع الاتصال وارمي خطأ بدل التعليق
    const dbPromise = db
      .select()
      .from(subAdminsTable)
      .where(eq(subAdminsTable.username, String(username).trim()))
      .limit(1);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database Timeout")), 4000)
    );

    // تنفيذ الاستعلام مع الحماية
    const [dbAdmin] = (await Promise.race([dbPromise, timeoutPromise])) as any[];
    
    console.log(`📡 [DATABASE RESPONSE] تم جلب البيانات بنجاح للمستخدم: [${username}]`);

    if (!dbAdmin || String(dbAdmin.password) !== String(password).trim()) {
      console.log(`❌ [LOGIN FAILED] بيانات الدخول غير صحيحة للمستخدم الفرعي: [${username}]`);
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    // @ts-ignore
    req.session.admin = {
      username: dbAdmin.username,
      role: dbAdmin.role || "subadmin", 
      assignedUnits: dbAdmin.assignedUnits || null,
    };

    // @ts-ignore
    await new Promise<void>((resolve, reject) => { req.session.save(err => err ? reject(err) : resolve()); });

    console.log(`✅ [SUCCESS] تم دخول المشرف الفرعي [${username}] بنجاح.`);
    res.json({
      success: true,
      role: dbAdmin.role || "subadmin",
      username: dbAdmin.username,
    });
  } catch (error: any) {
    console.error("💥 [CRITICAL AUTH ERROR]:", error.message || error);
    
    // إذا كان الخطأ بسبب الوقت المعلق
    if (error.message === "Database Timeout") {
      res.status(504).json({ error: "تأخرت استجابة قاعدة البيانات، يرجى المحاولة مرة أخرى" });
    } else {
      res.status(500).json({ error: "حدث خطأ في السيرفر أثناء الفحص، تأكد من رفع الجداول للداتابيز" });
    }
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  // @ts-ignore
  if (req.session) {
    try {
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
      res.clearCookie("srcs_volunteer_session", { path: "/", secure: true, sameSite: "none" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "خطأ في تسجيل الخروج" });
    }
  } else {
    res.json({ success: true });
  }
});

// ---------------- 3️⃣ فحص حالة الدخول الحالية (ME) ----------------
router.get("/me", async (req, res) => {
  // @ts-ignore
  if (!req.session || !req.session.admin) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  // @ts-ignore
  res.json(req.session.admin);
});

export default router;
