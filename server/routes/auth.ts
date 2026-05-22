import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; // تم الاستدعاء الصحيح بناءً على السكيما الحالية

// حساب الأدمن الرئيسي الثابت الخاص بك (أعلى صلاحية)
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
      role: hardcoded.role, // superadmin
      assignedUnits: null,  // يرى الـ 16 وحدة بالكامل
    };

    try {
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      console.log(`✅ [SUCCESS] تم دخول الأدمن الرئيسي [${username}] بنجاح وتخزين السيشن.`);
      res.json({
        success: true,
        role: hardcoded.role,
        username,
      });
      return;
    } catch (saveErr) {
      console.error("💥 [SESSION SAVE ERROR]:", saveErr);
      res.status(500).json({ error: "حدث خطأ أثناء حفظ جلسة الدخول" });
      return;
    }
  }

  // ثانياً: التحقق من المشرفين الآخرين (الفرعيين) من قاعدة بيانات نيون (Drizzle)
  try {
    console.log(`🔍 [DATABASE CHECK] جاري البحث عن المشرف الفرعي [${username}] في جدول sub_admins...`);
    
    // جلب بيانات المشرف الحقيقي المطابق لاسم المستخدم من جدول subAdminsTable
    const [dbAdmin] = await db
      .select()
      .from(subAdminsTable)
      .where(eq(subAdminsTable.username, String(username).trim()))
      .limit(1);
    
    // إذا لم يجد المشرف أو كانت كلمة المرور غير مطابقة
    if (!dbAdmin || String(dbAdmin.password) !== String(password).trim()) {
      console.log(`❌ [LOGIN FAILED] بيانات الدخول غير صحيحة للمستخدم الفرعي: [${username}]`);
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    // إذا نجح الدخول، يتم حفظ الجلسة بالصلاحيات المحددة له في جدول sub_admins
    // @ts-ignore
    req.session.admin = {
      username: dbAdmin.username,
      role: dbAdmin.role || "subadmin", 
      assignedUnits: dbAdmin.assignedUnits || null, // الوحدات المحددة له جغرافياً مثل: "1,2,3"
    };

    // إجبار السيرفر على حفظ السيشن بالكامل والانتظار
    // @ts-ignore
    await new Promise<void>((resolve, reject) => { req.session.save(err => err ? reject(err) : resolve()); });

    console.log(`✅ [SUCCESS] تم دخول المشرف الفرعي [${username}] بنجاح، الوحدات المصرحة له: [${dbAdmin.assignedUnits}]`);
    res.json({
      success: true,
      role: dbAdmin.role || "subadmin",
      username: dbAdmin.username,
    });
  } catch (error) {
    console.error("💥 Auth Database Error:", error);
    res.status(500).json({ error: "حدث خطأ في الخادم أثناء التحقق من المشرف" });
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  console.log("📢 [HIT] طلب تسجيل خروج...");

  // @ts-ignore
  if (req.session) {
    try {
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });

      res.clearCookie("srcs_volunteer_session", {
        path: "/",
        secure: true,
        sameSite: "none",
      });

      console.log("✅ [LOGOUT SUCCESS] تم تدمير الجلسة ومسح الكوكي بنجاح.");
      res.json({ success: true });
    } catch (destroyErr) {
      console.error("💥 [LOGOUT ERROR] فشل تدمير السيشن:", destroyErr);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الخروج" });
    }
  } else {
    res.json({ success: true });
  }
});

// ---------------- 3️⃣ فحص حالة الدخول الحالية (ME) ----------------
router.get("/me", async (req, res) => {
  // @ts-ignore
  if (!req.session || !req.session.admin) {
    console.log("👤 [CHECK ME] فحص الجلسة: لا يوجد مستخدم نشط.");
    res.status(401).json({ error: "غير مسجل الدخول، يرجى تسجيل الدخول أولاً" });
    return;
  }
  
  // @ts-ignore
  console.log("👤 [CHECK ME] فحص الجلسة: مستخدم نشط حالياً ->", req.session.admin.username);
  // @ts-ignore
  res.json(req.session.admin);
});

export default router;
