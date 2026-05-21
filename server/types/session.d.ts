import "iron-session";

declare module "iron-session" {
  interface IronSessionData {
    admin?: {
      username: string;
      role: "superadmin" | "subadmin"; // تحديد الرتب بدقة لتأمين الصلاحيات
      assignedUnits: string | null;     // معرفات الوحدات الـ 4 المخصصة لمشرف القطاع
    };
  }
}
