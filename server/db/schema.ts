import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { z } from "zod";

/* ---------------------- جدول الوحدات ---------------------- */

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sector: text("sector"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------- جدول المشرفين ---------------------- */

export const subAdminsTable = pgTable("sub_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  role: text("role").default("subadmin"),
  assignedUnits: text("assigned_units"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------- جدول المتطوعين ---------------------- */

export const volunteersTable = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  volunteerId: text("volunteer_id").notNull(),
  fullName: text("full_name").notNull(),
  nationalId: text("national_id").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  yearOfVolunteering: text("year_of_volunteering").notNull(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"),
  isTotTrainer: boolean("is_tot_trainer").notNull().default(false),
  totYear: text("tot_year"),
  totCertificateUrl: text("tot_certificate_url"),
  otherCertificateUrl: text("other_certificate_url"),
  lastFirstAidRefresher: text("last_first_aid_refresher"),
  otherPrograms: text("other_programs"),
  currentStatusInKhartoum: text("current_status_in_khartoum").notNull(),
  expectedReturnTime: text("expected_return_time"),
  availabilityLevel: text("availability_level").notNull(),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------- Zod Schemas ---------------------- */

// مخطط إدخل الوحدات الصافي
export const insertUnitSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "اسم الوحدة مطلوب"),
  sector: z.string().optional().nullable(),
  createdAt: z.any().optional(),
});

// مخطط إدخال المتطوعين الصافي
export const insertVolunteerSchema = z.object({
  id: z.number().optional(),
  volunteerId: z.string().optional(),
  fullName: z.string().min(1, "الاسم الكامل مطلوب"),
  nationalId: z.string().min(1, "الرقم الوطني مطلوب"),
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
  whatsapp: z.string().optional().nullable(),
  yearOfVolunteering: z.string().min(1, "سنة بدء التطوع مطلوبة"),
  unitId: z.coerce.number({ required_error: "يرجى اختيار الوحدة التابع لها" }),
  photoUrl: z.string().optional().nullable(),
  isTotTrainer: z.boolean().default(false),
  totYear: z.string().optional().nullable(),
  totCertificateUrl: z.string().optional().nullable(),
  otherCertificateUrl: z.string().optional().nullable(),
  lastFirstAidRefresher: z.string().optional().nullable(),
  otherPrograms: z.string().optional().nullable(),
  currentStatusInKhartoum: z.string().min(1, "الوضع الحالي في الخرطوم مطلوب"),
  expectedReturnTime: z.string().optional().nullable(),
  availabilityLevel: z.string().min(1, "مستوى الجاهزية مطلوب"),
  agreedToTerms: z.boolean().default(false),
  status: z.string().optional().default("pending"),
  approvedAt: z.any().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  createdAt: z.any().optional(),
});

export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;

export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteersTable.$inferSelect;

export type VolunteerStatus = "pending" | "approved" | "rejected";
export type VolunteerAvailabilityLevel = "full-time" | "part-time" | "occasional";

/* ---------------------- إحصائيات ---------------------- */

export const VolunteerStatsSchema = z.object({
  total: z.number(),
  approved: z.number(),
  pending: z.number(),
  rejected: z.number(),
  byUnit: z.array(z.object({
    unitName: z.string(),
    count: z.number()
  })).optional(),
  byAvailability: z.array(z.object({
    name: z.string(),
    value: z.number()
  })).optional(),
});

export type VolunteerStats = z.infer<typeof VolunteerStatsSchema>;
