import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; 

const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

const router = Router();

// دالة تحويل الوحدات إلى أرقام
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
    res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
    return;
  }

  // أولاً: الأدمن الرئيسي
  const hardcoded = SUPERADMINS[username];
  if (hardcoded && String(hardcoded.password) === String(password).trim()) {
    console.log("🔓 [PROCESS] حساب أدمن رئيسي صحيح. جاري إعداد السيشن...");

    // @ts-ignore
    req.session.admin = {
      username,
      role: hardcoded.role,
      assignedUnits: [], 
    };

    // كسر التعليقة الصامتة: نحفظ السيشن وفي نفس الوقت نرسل الرد فوراً دون انتظار معلق
    // @ts-ignore
    req.session.save((err) => {
      if (err) console.error("⚠️ [SESSION SAVE ERROR]:", err);
      else console.log("💾 [SESSION SUCCESS] تم حفظ جلسة الأدمن بنجاح.");
    });

    console.log(`🚀 [SUCCESS] إرسال استجابة الدخول بنجاح للأدمن: [${username}]`);
    res.json({ success: true, role: hardcoded.role, username });
    return;
  }

  // ثانياً: المشرفين الفرعيين
  try {
    console.log(`🔍 [DATABASE CHECK] جاري البحث عن المشرف الفرعي [${username}]...`);
    
    const [dbAdmin] = await db
      .select()
      .from(subAdminsTable)
      .where(eq(subAdminsTable.username, String(username).trim()))
      .limit(1);
    
    if (!dbAdmin || String(dbAdmin.password) !== String(password).trim()) {
      console.log(`❌ [LOGIN FAILED] بيانات الدخول غير صحيحة للمستخدم: [${username}]`);
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    console.log(`📡 [DATABASE RESPONSE] تم العثور على [${username}] وتطابق البيانات.`);

    const safeUnits = parseAssignedUnits(dbAdmin.assignedUnits);

    // @ts-ignore
    req.session.admin = {
      username: dbAdmin.username,
      role: dbAdmin.role || "subadmin", 
      assignedUnits: safeUnits,
    };

    // حفظ السيشن بشكل خلفي لعدم تعليق الطلب
    // @ts-ignore
    req.session.save((err) => {
      if (err) console.error("⚠️ [SESSION SAVE ERROR]:", err);
      else console.log(`💾 [SESSION SUCCESS] تم حفظ جلسة المشرف [${username}] بنجاح.`);
    });

    console.log(`🚀 [SUCCESS] إرسال استجابة الدخول بنجاح للمشرف: [${username}]`);
    res.json({
      success: true,
      role: dbAdmin.role || "subadmin",
      username: dbAdmin.username,
    });

  } catch (error: any) {
    console.error("💥 [CRITICAL AUTH ERROR]:", error.message || error);
    res.status(500).json({ error: "حدث خطأ في السيرفر أثناء معالجة الدخول" });
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  // @ts-ignore
  if (req.session) {
    // @ts-ignore
    req.session.destroy((err) => {
      if (err) console.error("💥 خطأ أثناء تدمير السيشن:", err);
    });
  }
  res.clearCookie("srcs_volunteer_session", { path: "/", secure: true, sameSite: "none" });
  res.json({ success: true });
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
