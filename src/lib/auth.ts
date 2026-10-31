import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { patients, sessions, staffUsers, type StaffUser } from "@/db/schema";
import { hashPassword, hashToken } from "@/lib/security";
import type { Permission } from "@/lib/permissions";

const cookieNames = { patient: "clinic_patient_session", staff: "clinic_staff_session" } as const;
type Kind = keyof typeof cookieNames;
function embeddedName(kind: Kind) { return `${cookieNames[kind]}_embedded`; }

export async function createSession(kind: Kind, subjectId: number) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const token = crypto.randomBytes(32).toString("hex");
  const seconds = kind === "patient" ? 60 * 60 * 24 * 14 : 60 * 60 * 8;
  await db.insert(sessions).values({ tokenHash: hashToken(token), subjectType: kind, subjectId, expiresAt: new Date(Date.now() + seconds * 1000) });
  const store = await cookies();
  // First-party visits retain SameSite=Lax; the separate partitioned cookie
  // allows an isolated embedded preview without sharing that session across sites.
  store.set(cookieNames[kind], token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: seconds });
  store.set(embeddedName(kind), token, { httpOnly: true, sameSite: "none", secure: true, partitioned: true, path: "/", maxAge: seconds });
}

async function subjectId(kind: Kind): Promise<number | null> {
  const store = await cookies();
  const tokens = [store.get(cookieNames[kind])?.value, store.get(embeddedName(kind))?.value]
    .filter((value): value is string => !!value && /^[0-9a-f]{64}$/.test(value));
  if (!tokens.length) return null;
  const [row] = await db.select().from(sessions).where(and(
    inArray(sessions.tokenHash, tokens.map(hashToken)), eq(sessions.subjectType, kind), gt(sessions.expiresAt, new Date()),
  )).limit(1);
  return row?.subjectId ?? null;
}
export async function getPatient() {
  const id = await subjectId("patient");
  if (!id) return null;
  const [row] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.phoneVerified, true))).limit(1);
  return row ?? null;
}
export async function getStaff(): Promise<StaffUser | null> {
  const id = await subjectId("staff");
  if (!id) return null;
  const [row] = await db.select().from(staffUsers).where(and(eq(staffUsers.id, id), eq(staffUsers.active, true))).limit(1);
  return row ?? null;
}
export function can(staff: StaffUser | null, permission: Permission): boolean { return !!staff && !staff.mustChangePassword && (staff.role === "super_admin" || (staff.permissions || []).includes(permission)); }
export function canModerateReviews(staff: StaffUser | null): boolean { return !!staff && (staff.role === "super_admin" || staff.role === "admin") && can(staff, "reviews.manage"); }
export async function isAdminAuthenticated() { const staff = await getStaff(); return !!staff && !staff.mustChangePassword; }
export async function logout(kind: Kind) {
  const store = await cookies();
  const tokens = [store.get(cookieNames[kind])?.value, store.get(embeddedName(kind))?.value].filter((value): value is string => !!value);
  if (tokens.length) await db.delete(sessions).where(and(eq(sessions.subjectType, kind), inArray(sessions.tokenHash, tokens.map(hashToken))));
  store.set(cookieNames[kind], "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  store.set(embeddedName(kind), "", { httpOnly: true, sameSite: "none", secure: true, partitioned: true, path: "/", maxAge: 0 });
}
export async function revokeSessions(kind: Kind, id: number) { await db.delete(sessions).where(and(eq(sessions.subjectType, kind), eq(sessions.subjectId, id))); }

/** First senior administrator is bootstrapped once from server environment. */
export async function ensureSuperAdmin() {
  const [existing] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.role, "super_admin")).limit(1);
  if (existing) return;
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 8) return;
  const passwordHash = await hashPassword(password);
  await db.insert(staffUsers).values({ name: "مدیر ارشد", username, passwordHash, role: "super_admin", permissions: [], mustChangePassword: true }).onConflictDoNothing();
}
