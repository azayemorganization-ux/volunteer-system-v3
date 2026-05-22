import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; 

const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

const router = Router();

// دالة تحويل الوحدات إلى مصفوفة أرقام
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
    return res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
  }

  try {
    let userData: any = null;
    const hardcoded = SUPERADMINS[username];

    // أولاً: التحقق من الأدمن الرئيسي
    if (hardcoded && String(hardcoded.password) === String(password).trim()) {
      console.log("🔓 [PROCESS] حساب أدمن رئيسي صحيح. جاري إعداد السيشن...");
      userData = { 
        username, 
        role: "superadmin", 
        assignedUnits: [] 
      };
    } else {
      // ثانياً: المشرفين الفرعيين من الداتابيز
      console.log(`🔍 [DATABASE CHECK] جاري البحث عن المشرف الفرعي [${username}]...`);
      const [dbAdmin] = await db
        .select()
        .from(subAdminsTable)
        .where(eq(subAdminsTable.username, String(username).trim()))
        .limit(1);

      if (dbAdmin && String(dbAdmin.password) === String(password).trim()) {
        console.log(`📡 [DATABASE RESPONSE] تم العثور على [${username}] وتطابق البيانات.`);
        userData = {
          username: dbAdmin.username,
          role: dbAdmin.role || "subadmin",
          assignedUnits: parseAssignedUnits(dbAdmin.assignedUnits),
        };
      }
    }

    // إذا لم تتطابق البيانات مع أي نوع مستخدم
    if (!userData) {
      console.log(`❌ [LOGIN FAILED] بيانات الدخول غير صحيحة للمستخدم: [${username}]`);
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // إعداد وحفظ السيشن بشكل متزامن وصحيح
    // @ts-ignore
    req.session.admin = userData;
    
    // ⚠️ الحل هنا: استدعاء الحفظ المباشر بـ await لمنع التعليق ومنع الـ Headers Sent Error
    // @ts-ignore
    await req.session.save(); 
    console.log(`💾 [SESSION SUCCESS] تم حفظ جلسة [${username}] بنجاح في الكوكي.`);

    console.log(`🚀 [SUCCESS] إرسال استجابة الدخول بنجاح للمستخدم: [${username}]`);
    return res.json({ success: true, ...userData });

  } catch (error: any) {
    console.error("💥 [CRITICAL AUTH ERROR]:", error.message || error);
    return res.status(500).json({ error: "حدث خطأ في السيرفر أثناء معالجة الدخول" });
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  // @ts-ignore
  if (req.session) {
    // @ts-ignore
    await req.session.destroy();
  }
  res.clearCookie("srcs_volunteer_session", { path: "/", secure: true, sameSite: "none" });
  return res.json({ success: true });
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
