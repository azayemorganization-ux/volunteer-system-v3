import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { subAdminsTable } from "../db/schema.js"; 

const SUPERADMINS: Record<string, any> = {
  admin: { password: "125", role: "superadmin" },
};

const router = Router();

// دالة تحويل الوحدات
function parseAssignedUnits(unitsStr: string | null | undefined): number[] {
  if (!unitsStr || typeof unitsStr !== "string") return [];
  return unitsStr
    .split(",")
    .map(u => parseInt(u.trim(), 10))
    .filter(u => !isNaN(u));
}

// دالة مساعدة لحفظ السيشن بشكل آمن (Promisified)
const saveSession = (req: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.save((err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// ---------------- 1️⃣ تسجيل الدخول (LOGIN) ----------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`📢 [HIT] محاولة تسجيل دخول: [${username}]`);

  if (!username || !password) {
    return res.status(400).json({ error: "الرجاء إدخال البيانات" });
  }

  try {
    let userData: any = null;
    const hardcoded = SUPERADMINS[username];

    // التحقق من الأدمن
    if (hardcoded && String(hardcoded.password) === String(password).trim()) {
      userData = { username, role: "superadmin", assignedUnits: [] };
    } else {
      // التحقق من الداتابيز
      const [dbAdmin] = await db
        .select()
        .from(subAdminsTable)
        .where(eq(subAdminsTable.username, String(username).trim()))
        .limit(1);

      if (dbAdmin && String(dbAdmin.password) === String(password).trim()) {
        userData = {
          username: dbAdmin.username,
          role: dbAdmin.role || "subadmin",
          assignedUnits: parseAssignedUnits(dbAdmin.assignedUnits),
        };
      }
    }

    if (!userData) {
      console.log(`❌ [LOGIN FAILED] بيانات غير صحيحة: [${username}]`);
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // إعداد وحفظ السيشن
    // @ts-ignore
    req.session.admin = userData;
    await saveSession(req); // ننتظر الحفظ قبل الرد

    console.log(`🚀 [SUCCESS] تم تسجيل دخول: [${username}]`);
    return res.json({ success: true, ...userData });

  } catch (error: any) {
    console.error("💥 [AUTH ERROR]:", error);
    return res.status(500).json({ error: "حدث خطأ داخلي" });
  }
});

// ---------------- 2️⃣ تسجيل الخروج (LOGOUT) ----------------
router.post("/logout", async (req, res) => {
  // @ts-ignore
  req.session.destroy((err) => {
    if (err) console.error("💥 خطأ:", err);
    res.clearCookie("srcs_volunteer_session");
    res.json({ success: true });
  });
});

// ---------------- 3️⃣ فحص حالة الدخول (ME) ----------------
router.get("/me", (req, res) => {
  // @ts-ignore
  if (req.session && req.session.admin) {
    // @ts-ignore
    return res.json(req.session.admin);
  }
  return res.status(401).json({ error: "غير مسجل" });
});

export default router;
