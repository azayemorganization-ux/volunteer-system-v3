// تحديد رابط الباك إند ديناميكياً: يتوافق مع بيئة Vite الذكية في التطوير والإنتاج
const API_URL = import.meta.env.PROD
  ? "https://your-backend-url.onrender.com/api" // 👈 استبدله برابط سيرفر Render الفعلي لاحقاً
  : "http://localhost:5000/api";

// دالة مساعدة موحدة لإضافة إعدادات الأمان والجلسات تلقائياً لكل الطلبات
const secureFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    credentials: "include", // 👈 حاسمة جداً لتمرير الـ Cookies والـ Session للسيرفر السحابي
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
};

// ========================================================
// 1️⃣ جلب قائمة المتطوعين (مع دعم الفلاتر والبحث الذكي وبدون any)
// ========================================================
export const fetchVolunteers = async (params: Record<string, string | number | boolean> = {}) => {
  // تحويل البارامترات إلى string بشكل آمن
  const stringParams = Object.keys(params).reduce((acc, key) => {
    acc[key] = String(params[key]);
    return acc;
  }, {} as Record<string, string>);

  const query = new URLSearchParams(stringParams).toString();
  const res = await secureFetch(`/volunteers?${query}`);
  if (!res.ok) throw new Error("فشل جلب بيانات المتطوعين من السيرفر المركزى");
  return res.json();
};

// ========================================================
// 2️⃣ جلب قائمة الوحدات الـ 16 (للقوائم المنسدلة والتسجيل)
// ========================================================
export const fetchUnits = async () => {
  const res = await secureFetch("/units");
  if (!res.ok) throw new Error("فشل جلب قائمة الوحدات الجغرافية");
  return res.json();
};

// ========================================================
// 3️⃣ جلب الإحصائيات التفصيلية للوحة التحكم (Stats)
// ========================================================
export const fetchStats = async () => {
  const res = await secureFetch("/volunteers/stats");
  if (!res.ok) throw new Error("فشل جلب الإحصائيات والتقارير الميدانية");
  return res.json();
};

// ========================================================
// 4️⃣ جلب وإدارة قائمة المشرفين الفرعيين وحسابات القطاعات
// ========================================================
export const fetchSubAdmins = async () => {
  const res = await secureFetch("/sub-admins");
  if (!res.ok) throw new Error("فشل جلب قائمة المشرفين المسؤولين");
  return res.json();
};

// ========================================================
// 5️⃣ جلب بيانات متطوع محدد عبر الـ QR (Public)
// ========================================================
export const fetchPublicVolunteer = async (id: string) => {
  const res = await secureFetch(`/volunteers/public/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("عفواً، سجل المتطوع هذا غير موجود أو تم تعليقه");
  return res.json();
};

// ========================================================
// 6️⃣ استعلام المتطوع عن حالة طلبه بالرقم الوطني (Public)
// ========================================================
export const checkVolunteerStatus = async (nationalId: string) => {
  const res = await secureFetch(`/volunteers/check-status?nationalId=${encodeURIComponent(nationalId)}`);
  if (res.status === 404) throw { status: 404, message: "لا يوجد سجل مرتبط بهذا الرقم الوطني" };
  if (!res.ok) throw new Error("حدث خطأ أثناء فحص حالة الطلب");
  return res.json();
};

// ========================================================
// 7️⃣ فحص نبض السيرفر المركزي (لصفحة Health الفورية)
// ========================================================
export const fetchSystemHealth = async () => {
  const res = await secureFetch("/health");
  if (!res.ok) throw new Error("خادم التحقق والـ API غير مستجيب حالياً");
  return res.json();
};
