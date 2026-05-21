import { Router } from "express";
import { db } from "../db/index.js";
import { unitsTable, volunteersTable } from "../db/schema.js";
import { eq, asc, count } from "drizzle-orm";

const router = Router();

// ==========================================
// دوال الحماية والتحقق من الصلاحيات الجلسية
// ==========================================
function requireAdmin(req, res) {
  if (!req.session || !req.session.admin) {
    res.status(401).json({ error: "غير مصرح، يرجى تسجيل الدخول أولاً" });
    return false;
  }
  return true;
}

function requireSuperAdmin(req, res) {
  if (!requireAdmin(req, res)) return false;

  if (req.session.admin.role !== "superadmin") {
    res.status(403).json({ error: "هذا الإجراء متاح للمسؤول الرئيسي فقط" });
    return false;
  }

  return true;
}

// ==========================================
// 1️⃣ جلب جميع الوحدات (متاح للجميع للتسجيل المباشر)
// ==========================================
router.get("/", async (_req, res) => {
  try {
    const units = await db
      .select()
      .from(unitsTable)
      .orderBy(asc(unitsTable.name));

    res.json(units);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "فشل في جلب البيانات من قاعدة البيانات",
      details: error.message,
    });
  }
});

// ==========================================
// 2️⃣ إضافة وحدة جديدة بالنظام (أدمن فرعي أو رئيسي)
// ==========================================
router.post("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { name, sector } = req.body;

  if (!name || name.trim() === "") {
    res.status(400).json({ error: "اسم الوحدة مطلوب" });
    return;
  }

  try {
    const [unit] = await db
      .insert(unitsTable)
      .values({
        name: name.trim(),
        sector: sector ? sector.trim() : null,
      })
      .returning();

    res.status(201).json(unit);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "فشل في حفظ الوحدة في قاعدة البيانات",
      details: error.message,
    });
  }
});

// ==========================================
// 3️⃣ حذف وحدة من النظام (مسموح فقط للـ superadmin)
// ==========================================
router.delete("/:id", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;

  const unitId = Number(req.params.id);
  if (isNaN(unitId)) {
    res.status(400).json({ error: "معرف الوحدة غير صحيح" });
    return;
  }

  try {
    // التحقق من وجود متطوعين مرتبطين بالوحدة لمنع كسر العلاقات في قاعدة البيانات
    const [checkResults] = await db
      .select({ value: count() })
      .from(volunteersTable)
      .where(eq(volunteersTable.unitId, unitId));

    const volunteersCount = checkResults?.value || 0;

    if (volunteersCount > 0) {
      res.status(409).json({
        error: "لا يمكن حذف الوحدة لأنها تحتوي على متطوعين مسجلين بالفعل",
      });
      return;
    }

    await db
      .delete(unitsTable)
      .where(eq(unitsTable.id, unitId));

    res.sendStatus(204);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "حدث خطأ غير متوقع أثناء محاولة الحذف",
      details: error.message,
    });
  }
});

export default router;
