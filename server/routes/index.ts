import { Router } from "express";

// استدعاء الموزعات الفرعية للعمليات
import authRouter from "./auth.js";
import unitsRouter from "./units.js";
import volunteersRouter from "./volunteers.js";
import subAdminsRouter from "./sub-admins.js";

const router = Router();

// مسارات التحقق من الهوية وتسجيل دخول المشرفين (الأدمن، الفرعي، القطاع)
router.use("/auth", authRouter);

// مسارات الوحدات الـ 16 التابعة لمحلية جبل أولياء
router.use("/units", unitsRouter);

// مسارات استمارات المتطوعين، الاستعلام بالرقم الوطني، والاعتماد/الرفض
router.use("/volunteers", volunteersRouter);

// مسارات إدارة المشرفين (خاصة بالأدمن الرئيسي لإنشاء الحسابات)
router.use("/sub-admins", subAdminsRouter);

export default router;
