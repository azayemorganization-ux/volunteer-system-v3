import { Router } from "express";
// هنا سنستدعي الـ db الخاصة بـ Firebase لاحقاً، سنجهز الكود ليتوافق معها تلقائياً
// import { db } from "../config/firebase.js"; 

const router = Router();

// حساب الأدمن الرئيسي الثابت الخاص بك (أعلى صلاحية)
const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

// ---------------- 1️⃣ تسجيل الدخول (LOGIN) ----------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
    return;
  }

  // أولاً: التحقق إذا كان الحساب هو الأدمن الرئيسي (أنت)
  const hardcoded = SUPERADMINS[username];
  if (hardcoded && hardcoded.password === password) {
    // @ts-ignore
    req.session.admin = {
      username,
      role: hardcoded.role, // superadmin
      assignedUnits: null,  // يرى الـ 16 وحدة بالكامل
    };

    // @ts-ignore
    await req.session.save();

    res.json({
      success: true,
      role: hardcoded.role,
      username,
    });
    return;
  }

  // ثانياً: التحقق من المشرفين الآخرين (فرعي / قطاع) من قاعدة بيانات Firebase
  try {
    // هنا جلب بيانات المشرف من الفايربيز (سنفعل سطر الجلب عند تجهيز ملف الفايربيز الرئيسي)
    // const adminDoc = await db.collection("subAdmins").doc(username).get();
    
    // محاكاة مؤقتة للبناء حتى نربط الفايربيز في الخطوة القادمة
    const subAdminExists = false; 
    
    if (!subAdminExists) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    // إذا نجح الدخول، يتم حفظ الجلسة بالصلاحيات المحددة له (مثلاً الـ 4 وحدات الجغرافية)
    // @ts-ignore
    req.session.admin = {
      username: username,
      role: "subadmin", // أو الرتبة القادمة من داتابيز
      assignedUnits: null, // الوحدات المحددة له جغرافياً
    };

    // @ts-ignore
    await req.session.save();

    res.json({
      success: true,
      role: "subadmin",
      username: username,
    });
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(500).json({ error: "حدث خطأ في الخادم أثناء تسجيل الدخول" });
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  // @ts-ignore
  if (req.session) {
    // @ts-ignore
    req.session.destroy();
    res.clearCookie("srcs_volunteer_session");
    res.json({ success: true });
  } else {
    res.json({ success: true });
  }
});

// ---------------- 3️⃣ فحص حالة الدخول الحالية (ME) ----------------
router.get("/me", async (req, res) => {
  // @ts-ignore
  if (!req.session || !req.session.admin) {
    res.status(401).json({ error: "غير مسجل الدخول، يرجى تسجيل الدخول أولاً" });
    return;
  }

  // @ts-ignore
  res.json(req.session.admin);
});

export default router;
