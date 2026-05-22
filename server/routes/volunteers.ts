import { Router } from "express";
import { eq, and, or, ilike, inArray, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { volunteersTable, unitsTable, insertVolunteerSchema } from "../db/schema.js";

const router = Router();

// --- 1. دالة مساعدة لتحديد الوحدات المسموح بها لمشرف القطاع جغرافياً ---
function getAdminUnitCondition(req) {
  const admin = req.session.admin;
  if (!admin) return eq(volunteersTable.id, -1); // شرط مستحيل للحماية

  const role = admin.role;
  const assignedUnitsRaw = admin.assignedUnits;

  // المشرف الرئيسي يشوف كل شيء
  if (role === "superadmin") return null;

  // مشرف قطاع عنده وحدات مخصصة (مثلاً 4 وحدات)
  if (assignedUnitsRaw) {
    const unitIds = String(assignedUnitsRaw)
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((n) => !isNaN(n));

    if (unitIds.length > 0) {
      return inArray(volunteersTable.unitId, unitIds);
    }
  }

  return eq(volunteersTable.id, -1); // احتياطاً لا يرى شيء
}

// --- 2. توليد معرف المتطوع الاحترافي التلقائي ---
function generateVolunteerId() {
  const year = new Date().getFullYear(); // 2026
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `SRCS-${year}-${rand}`;
}

// --- 3. دوال الحماية والتحقق من الصلاحيات ---
function requireAdmin(req, res) {
  if (!req.session || !req.session.admin) {
    res.status(401).json({ error: "غير مصرح، الرجاء تسجيل الدخول أولاً" });
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

// ========================================================
// 4. المسار العام للاستعلام عبر الـ QR المطبوع على البطاقة (Public)
// ========================================================
router.get("/public/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id).trim();

    // البحث بـ الـ volunteerId النصي أو الـ id الرقمي
    const isNumber = !isNaN(Number(decodedId));
    
    const results = await db
      .select({
        volunteer: volunteersTable,
        unit: unitsTable,
      })
      .from(volunteersTable)
      .leftJoin(unitsTable, eq(volunteersTable.unitId, unitsTable.id))
      .where(
        or(
          eq(volunteersTable.volunteerId, decodedId),
          isNumber ? eq(volunteersTable.id, Number(decodedId)) : undefined
        )
      );

    if (results.length === 0) {
      res.status(404).json({ error: "عفواً، السجل غير موجود بالنظام" });
      return;
    }

    const data = results[0];
    res.json({
      ...data.volunteer,
      unitName: data.unit?.name ?? "غير محدد",
      sectorName: data.unit?.sector ?? "-",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في خادم البيانات" });
  }
});

// ========================================================
// 5. مسار الأدمن لجلب وعرض قائمة المتطوعين مع الفلاتر الذكية
// ========================================================
router.get("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { unitId, search, status } = req.query;
    const unitCondition = getAdminUnitCondition(req);

    // تجهيز شروط الفلترة بناءً على الطلب قادم من الفرونت إند
    const conditions = [];
    if (unitCondition) conditions.push(unitCondition);
    if (unitId) conditions.push(eq(volunteersTable.unitId, Number(unitId)));
    if (status && status !== "all") conditions.push(eq(volunteersTable.status, String(status)));
    if (search) conditions.push(ilike(volunteersTable.fullName, `%${search}%`));

    const results = await db
      .select({
        volunteer: volunteersTable,
        unit: unitsTable,
      })
      .from(volunteersTable)
      .leftJoin(unitsTable, eq(volunteersTable.unitId, unitsTable.id))
      .where(and(...conditions))
      .orderBy(desc(volunteersTable.createdAt));

    res.json(
      results.map((r) => ({
        ...r.volunteer,
        unitName: r.unit?.name ?? "غير محدد",
        sectorName: r.unit?.sector ?? "-",
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في جلب بيانات المتطوعين" });
  }
});

// ========================================================
// 6. مسار الإحصائيات التفصيلية للوحة التحكم (Stats)
// ========================================================
router.get("/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const unitCondition = getAdminUnitCondition(req);

    const conditions = unitCondition ? [unitCondition] : [];

    const allVolunteers = await db
      .select({
        status: volunteersTable.status,
        unitId: volunteersTable.unitId,
        unitName: unitsTable.name,
      })
      .from(volunteersTable)
      .leftJoin(unitsTable, eq(volunteersTable.unitId, unitsTable.id))
      .where(and(...conditions));

    let total = allVolunteers.length;
    let approved = allVolunteers.filter(v => v.status === "approved").length;
    let pending = allVolunteers.filter(v => v.status === "pending").length;
    let rejected = allVolunteers.filter(v => v.status === "rejected").length;

    // حساب إحصائيات الوحدات المعتمدة
    const unitCounts = {};
    allVolunteers.filter(v => v.status === "approved").forEach(v => {
      const name = v.unitName || "غير محدد";
      unitCounts[name] = (unitCounts[name] || 0) + 1;
    });

    const byUnitFormatted = Object.keys(unitCounts).map(name => ({
      unitName: name,
      count: unitCounts[name]
    }));

    res.json({ total, approved, pending, rejected, byUnit: byUnitFormatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في توليد التقارير والإحصائيات" });
  }
});

// ========================================================
// 7. استعلام المتطوع عن حالة طلبه باستخدام الرقم الوطني (Public)
// ========================================================
router.get("/check-status", async (req, res) => {
  const { nationalId } = req.query;

  if (!nationalId) {
    res.status(400).json({ error: "الرجاء إدخال الرقم الوطني" });
    return;
  }

  try {
    const results = await db
      .select({
        volunteer: volunteersTable,
        unit: unitsTable,
      })
      .from(volunteersTable)
      .leftJoin(unitsTable, eq(volunteersTable.unitId, unitsTable.id))
      .where(eq(volunteersTable.nationalId, String(nationalId).trim()))
      .limit(1);

    if (results.length === 0) {
      res.status(404).json({ error: "عفواً، لا يوجد سجل بهذا الرقم الوطني" });
      return;
    }

    const data = results[0];
    res.json({
      ...data.volunteer,
      unitName: data.unit?.name ?? "غير محدد",
      sectorName: data.unit?.sector ?? "-",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ أثناء فحص حالة الطلب" });
  }
});

// ========================================================
// 8. تسجيل استمارة متطوع جديد بالكامل (Public)
// ========================================================
router.post("/", async (req, res) => {
  // فحص البيانات عبر Zod للتأكد من سلامتها قبل الدخول للداتابيز
  const parsed = insertVolunteerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "الرجاء مراجعة البيانات المدخلة وإكمال الحقول المطلوبة" });
    return;
  }

  try {
    const d = parsed.data;

    // التحقق من عدم التكرار (بالاسم الكامل أو الرقم الوطني الفريد)
    const existing = await db
      .select()
      .from(volunteersTable)
      .where(
        or(
          eq(volunteersTable.fullName, d.fullName.trim()),
          eq(volunteersTable.nationalId, d.nationalId.trim())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "عذراً، هذا المتطوع (الاسم أو الرقم الوطني) مسجل بالفعل في النظام" });
      return;
    }

    // الروابط الافتراضية للملفات (Cloudinary سنقوم بدمجه لاحقاً كخطوتنا القادمة المتفق عليها)
    let finalPhotoUrl = d.photoUrl || null;
    let finalTotCertUrl = d.totCertificateUrl || null;
    let finalOtherCertUrl = d.otherCertificateUrl || null;

    const [newVolunteer] = await db.insert(volunteersTable).values({
      volunteerId: generateVolunteerId(),
      fullName: d.fullName.trim(),
      nationalId: d.nationalId.trim(),
      phone: d.phone.trim(),
      whatsapp: d.whatsapp ? d.whatsapp.trim() : null,
      yearOfVolunteering: d.yearOfVolunteering,
      unitId: Number(d.unitId),
      photoUrl: finalPhotoUrl,
      isTotTrainer: d.isTotTrainer,
      totYear: d.totYear,
      totCertificateUrl: finalTotCertUrl,
      otherCertificateUrl: finalOtherCertUrl,
      lastFirstAidRefresher: d.lastFirstAidRefresher,
      otherPrograms: d.otherPrograms,
      currentStatusInKhartoum: d.currentStatusInKhartoum,
      expectedReturnTime: d.expectedReturnTime,
      availabilityLevel: d.availabilityLevel,
      agreedToTerms: true,
      status: "pending",
    }).returning();

    res.status(201).json(newVolunteer);
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "حدث خطأ داخلي أثناء حفظ الاستمارة" });
  }
});

// ========================================================
// 9. عمليات المراجعة المحصنة: الاعتماد (Approve) والرفض (Reject) والحذف
// ========================================================
router.patch("/:id/approve", async (req, res) => {
  // 👇 1. سطر الكشف الأول: هل استقبل السيرفر النقرة أصلاً؟
  console.log("📢 [HIT] تم استقبال طلب اعتماد للمتطوع ID الحالي:", req.params.id);
  // 👇 2. سطر الكشف الثاني: هل الكوكي حقت السيشن واصلة ولا حجبها المتصفح؟
  console.log("👤 [SESSION COOKIE CHECK] بيانات الأدمن في السيشن حالياً:", req.session?.admin);

  if (!requireAdmin(req, res)) {
    console.log("❌ [AUTH FAILED] السيشن فارغ أو المتصفح رفض إرسال الكوكي (Cross-Site Cookie Blocked)");
    return;
  }

  console.log("🔓 [AUTH SUCCESS] تم التحقق من صلاحية المشرف، جاري معالجة تحديث البيانات في نيون...");

  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id).trim();
    const isNumber = !isNaN(Number(decodedId));

    const adminName = req.session.admin?.username || "مشرف نظام";
    console.log(`📝 [PROCESS] اسم المشرف: ${adminName} | المعرف الممرر: ${decodedId} (نوعه رقم: ${isNumber})`);

    const whereCondition = isNumber
      ? or(eq(volunteersTable.volunteerId, decodedId), eq(volunteersTable.id, Number(decodedId)))
      : eq(volunteersTable.volunteerId, decodedId);

    console.log("⏳ [DATABASE] جاري إرسال أمر التحديث الـ UPDATE إلى Neon Database...");

    const [updated] = await db
      .update(volunteersTable)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy: adminName,
      })
      .where(whereCondition)
      .returning();

    if (!updated) {
      console.log("⚠️ [NOT FOUND] الداتابيز لم تجد أي سجل يطابق هذا المعرف!");
      res.status(404).json({ error: "عفواً، لم يتم العثور على المتطوع لتحديث حالته" });
      return;
    }

    console.log("✅ [SUCCESS] تم التحديث بنجاح في نيون للمتطوع وبدء الحفظ:", updated.fullName);
    res.json(updated);
  } catch (err) {
    console.error("💥 [CRASH ERROR] Approve API Error Log:", err);
    res.status(500).json({ error: "فشل اعتماد طلب المتطوع" });
  }
});

router.patch("/:id/reject", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const { reason } = req.body;
    const decodedId = decodeURIComponent(id).trim();
    const isNumber = !isNaN(Number(decodedId));
    
    const adminName = req.session.admin?.username || "مشرف نظام";

    const whereCondition = isNumber
      ? or(eq(volunteersTable.volunteerId, decodedId), eq(volunteersTable.id, Number(decodedId)))
      : eq(volunteersTable.volunteerId, decodedId);

    const [updated] = await db
      .update(volunteersTable)
      .set({
        status: "rejected",
        rejectionReason: reason ? String(reason).trim() : "لم يذكر سبب",
        approvedBy: adminName,
      })
      .where(whereCondition)
      .returning();

    if (!updated) {
      res.status(404).json({ error: "عفواً، لم يتم العثور على سجل المتطوع" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("Reject API Error Log:", err);
    res.status(500).json({ error: "فشل رفض طلب المتطوع" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id).trim();
    const isNumber = !isNaN(Number(decodedId));

    const whereCondition = isNumber
      ? or(eq(volunteersTable.volunteerId, decodedId), eq(volunteersTable.id, Number(decodedId)))
      : eq(volunteersTable.volunteerId, decodedId);

    const [deleted] = await db
      .delete(volunteersTable)
      .where(whereCondition)
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "عفواً، السجل غير موجود أو تم حذفه مسبقاً" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    console.error("Delete API Error Log:", err);
    res.status(500).json({ error: "فشل حذف سجل المتطوع" });
  }
});

export default router;
