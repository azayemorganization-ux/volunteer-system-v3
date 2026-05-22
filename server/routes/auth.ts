import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; 

const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

const router = Router();

// دالة مساعدة لتحويل نص الوحدات (مثل "1,2,3") إلى مصفوفة أرقام نظيفة لعدم تضارب الأنواع
function parseAssignedUnits(unitsStr: string | null | undefined): number[] {
  if (!unitsStr || typeof unitsStr !== "string") return [];
  return unitsStr
    .split(",")
    .map(u => parseInt(u.trim(), 10))
    .filter(u => !isNaN(u));
}

// ---------------- 1️⃣ تسجيل الدخول (LOGIN) ----------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log(`📢 [HIT] محاولة تسجيل دخول جديدة للحساب: [${username}]`);

  if (!username || !password) {
    console.log("⚠️ [LOGIN FAILED] اسم المستخدم أو كلمة المرور فارغة");
    res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
    return;
  }

  // أولاً: الأدمن الرئيسي (أنت)
  const hardcoded = SUPERADMINS[username];
  if (hardcoded && String(hardcoded.password) === String(password).trim()) {
    
    // تأمين البيانات المرسلة للسيشن كأنواع متوافقة
    // @ts-ignore
    req.session.admin = {
      username,
      role: hardcoded.role, // superadmin
      assignedUnits: [],    // مصفوفة فارغة تعني السوبر أدمن يرى الكل ولا يتقيد بـ ID نصي
    };

    try {
      console.log("⏳ [SESSION SAVE] جاري حفظ جلسة الأدمن الرئيسي...");
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      console.log(`✅ [SUCCESS] تم دخول الأدمن الرئيسي [${username}] وحفظ الجلسة بنجاح.`);
      return res.json({ success: true, role: hardcoded.role, username });
    } catch (saveErr) {
      console.error("💥 [SESSION SAVE ERROR]:", saveErr);
      return res.status(500).json({ error: "حدث خطأ أثناء حفظ جلسة الدخول" });
    }
  }

  // ثانياً: المشرفين الفرعيين
  try {
    console.log(`🔍 [DATABASE CHECK] جاري البحث عن المشرف الفرعي [${username}]...`);
    
    const [dbAdmin] = await db
      .select()
      .from(subAdminsTable)
      .where(eq(subAdminsTable.username, String(username).trim()))
      .limit(1);
    
    if (!dbAdmin) {
      console.log(`❌ [LOGIN FAILED] المستخدم غير موجود في الداتابيز: [${username}]`);
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    console.log(`📡 [DATABASE RESPONSE] تم جلب بيانات [${username}] بنجاح. جاري مطابقة الباسورد...`);

    if (String(dbAdmin.password) !== String(password).trim()) {
      console.log(`❌ [LOGIN FAILED] كلمة المرور غير مطابقة للمستخدم: [${username}]`);
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // تجهيز الوحدات وتحويلها لنفس نوع بيانات جدول المتطوعين (Numbers) منعاً لخطأ 22P02
    const safeUnits = parseAssignedUnits(dbAdmin.assignedUnits);

    // @ts-ignore
    req.session.admin = {
      username: dbAdmin.username,
      role: dbAdmin.role || "subadmin", 
      assignedUnits: safeUnits, // أصبحت مصفوفة أرقام ملائمة ومؤمنة تماماً
    };

    console.log(`⏳ [SESSION SAVE] جاري حفظ جلسة المشرف الفرعي [${username}] في الذاكرة...`);
    
    // @ts-ignore
    await new Promise<void>((resolve, reject) => { 
      // @ts-ignore
      req.session.save(err => err ? reject(err) : resolve()); 
    });

    console.log(`✅ [SUCCESS] تم دخول المشرف [${username}] بنجاح. الوحدات كأرقام:`, safeUnits);
    return res.json({
      success: true,
      role: dbAdmin.role || "subadmin",
      username: dbAdmin.username,
    });

  } catch (error: any) {
    console.error("💥 [CRITICAL AUTH ERROR]:", error.message || error);
    return res.status(500).json({ error: "حدث خطأ في الخادم أثناء معالجة البيانات، تفقد أنواع الحقول" });
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
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "خطأ في تسجيل الخروج" });
    }
  } else {
    return res.json({ success: true });
  }
});

// ---------------- 3️⃣ فحص حالة الدخول الحالية (ME) ----------------
router.get("/me", async (req, res) => {
  // @ts-ignore
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: "غير مسجل الدخول" });
  }
  // @ts-ignore
  return res.json(req.session.admin);
});

export default router;
