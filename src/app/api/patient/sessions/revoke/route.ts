import { createSession, getPatient, revokeSessions } from "@/lib/auth";
import { sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const patient = await getPatient();
  if (!patient) return Response.json({ error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  await revokeSessions("patient", patient.id);
  await createSession("patient", patient.id);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
