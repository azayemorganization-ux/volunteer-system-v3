import { Router } from "express";
import { db } from "../db/index.js";
import { subAdminsTable } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// دالة الحماية الصارمة: المشرف الرئيسي (أنت) فقط من يدير الحسابات
function requireSuperAdmin(req, res) {
  if (!req.session || !req.session.admin) {
    res.status(401).json({ error: "غير مسجل الدخول، يرجى تسجيل الدخول أولاً" });
    return false;
  }

  if (req.session.admin.role !== "superadmin") {
    res.status(403).json({ error: "عذراً، هذه الصلاحية متاحة للمسؤول الرئيسي فقط" });
    return false;
  }

  return true;
}

// 1️⃣ عرض قائمة جميع المشرفين (الفرعيين والقطاعات)
router.get("/", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const admins = await db
      .select()
      .from(subAdminsTable)
      .orderBy(desc(subAdminsTable.createdAt));

    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "خطأ في جلب قائمة المشرفين" });
  }
});

// 2️⃣ إنشاء حساب مشرف جديد (فرعي أو قطاع وتحديد وحداته)
router.post("/", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const { username, password, displayName, role, assignedUnits } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة" });
      return;
    }

    // تأمين الحساب الرئيسي
    if (username === "admin") {
      res.status(400).json({ error: "اسم المستخدم هذا محجوز للنظام ولا يمكن تكراره" });
      return;
    }

    // التحقق من عدم تكرار اسم المستخدم في قاعدة البيانات
    const existing = await db
      .select()
      .from(subAdminsTable)
      .where(eq(subAdminsTable.username, username))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "اسم المستخدم مسجل بالفعل لمشرف آخر" });
      return;
    }

    const [created] = await db
      .insert(subAdminsTable)
      .values({
        username: username.trim(),
        password: password, // يفضل مستقبلاً تشفيرها بـ bcrypt، وسنتركها كما هي حالياً لتطابق مشروعك القديم
        displayName: displayName ? displayName.trim() : null,
        role: role || "subadmin",
        assignedUnits: assignedUnits ?? null,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "حدث خطأ داخلي أثناء إنشاء الحساب" });
  }
});

// 3️⃣ حذف حساب مشرف من النظام
router.delete("/:id", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "رقم المعرف غير صحيح" });
      return;
    }

    const [deleted] = await db
      .delete(subAdminsTable)
      .where(eq(subAdminsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "المشرف المطلوب غير موجود في النظام" });
      return;
    }

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "فشل حذف حساب المشرف" });
  }
});

export default router;
