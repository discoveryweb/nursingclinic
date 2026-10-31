import { boolean, check, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const visitTypes = ["clinic", "home"] as const;
export type VisitType = (typeof visitTypes)[number];

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  specialty: varchar("specialty", { length: 150 }).notNull(),
  bio: text("bio").notNull().default(""),
  imageUrl: varchar("image_url", { length: 500 }).notNull().default(""),
  experienceYears: integer("experience_years").notNull().default(0),
  workDays: jsonb("work_days").$type<number[]>().notNull().default(sql`'[6,0,1,2,3,4]'::jsonb`),
  visitModes: jsonb("visit_modes").$type<VisitType[]>().notNull().default(sql`'["clinic","home"]'::jsonb`),
  startTime: varchar("start_time", { length: 5 }).notNull().default("09:00"),
  endTime: varchar("end_time", { length: 5 }).notNull().default("17:00"),
  slotMinutes: integer("slot_minutes").notNull().default(30),
  active: boolean("active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  // Retained nullable for existing deployments; patient authentication is OTP-only.
  passwordHash: text("password_hash"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  address: text("address").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffUsers = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  doctorId: integer("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type StaffUser = typeof staffUsers.$inferSelect;

export const appointmentStatusValues = ["pending", "confirmed", "cancelled", "done"] as const;
export type AppointmentStatus = (typeof appointmentStatusValues)[number];
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "set null" }),
  patientName: varchar("patient_name", { length: 150 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 20 }).notNull(),
  visitType: varchar("visit_type", { length: 12 }).notNull().default("clinic"),
  patientAddress: text("patient_address").notNull().default(""),
  patientNote: text("patient_note").notNull().default(""),
  appointmentDate: varchar("appointment_date", { length: 10 }).notNull(),
  appointmentTime: varchar("appointment_time", { length: 5 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("appointments_slot_unique_idx").on(table.doctorId, table.appointmentDate, table.appointmentTime).where(sql`${table.status} <> 'cancelled'`),
  index("appointments_patient_date_idx").on(table.patientId, table.appointmentDate),
  index("appointments_date_status_idx").on(table.appointmentDate, table.status),
  check("appointments_visit_type_check", sql`${table.visitType} in ('clinic', 'home')`),
]);
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Reviews are never public before an authorised manager approves them.
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("reviews_appointment_unique_idx").on(table.appointmentId),
  index("reviews_doctor_status_idx").on(table.doctorId, table.status, table.createdAt),
  check("reviews_rating_check", sql`${table.rating} between 1 and 5`),
  check("reviews_status_check", sql`${table.status} in ('pending', 'approved')`),
]);
export type Review = typeof reviews.$inferSelect;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 20 }).notNull(),
  recipient: varchar("recipient", { length: 20 }).notNull().default(""),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  providerResponse: text("provider_response").notNull().default(""),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("notifications_created_at_idx").on(table.createdAt),
  index("notifications_appointment_channel_idx").on(table.appointmentId, table.channel, table.status),
]);
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type SettingRow = typeof settings.$inferSelect;

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  subjectType: varchar("subject_type", { length: 16 }).notNull(),
  subjectId: integer("subject_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("sessions_expiry_idx").on(table.expiresAt),
  index("sessions_subject_idx").on(table.subjectType, table.subjectId),
]);
export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 64 }).primaryKey(),
  requests: integer("requests").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const loginAttempts = pgTable("login_attempts", {
  key: varchar("key", { length: 64 }).primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  tokenHash: varchar("token_hash", { length: 64 }),
  verifiedUntil: timestamp("verified_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("phone_verification_phone_purpose_idx").on(table.phone,table.purpose),
  index("phone_verifications_expiry_idx").on(table.expiresAt),
]);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: varchar("actor", { length: 150 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("audit_logs_created_at_idx").on(table.createdAt)]);
