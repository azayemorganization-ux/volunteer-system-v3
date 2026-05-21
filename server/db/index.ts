import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

// الفحص الأمني والتنبيه في حال فقدان مفتاح الاتصال
if (!connectionString) {
  console.log("⚠️ تنبيه حرج: السيرفر شغال بس ما لاقي DATABASE_URL في ملف الـ .env");
}

// إنشاء اتصال سريع وذكي عبر الـ HTTP متوافق مع خوادم Neon السحابية
const sql = neon(connectionString || "");

// تصدير متغير الـ db الأساسي مع تمرير الـ schema للتحكم بالجداول
export const db = drizzle(sql, { schema });

// تصدير كل محتويات الاسكيما عشان تقدر تستدعي الجداول مباشرة في بقية المشروع
export * from "./schema.js";
