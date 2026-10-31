/** Allow only known same-site destinations after authentication. */
export function safePatientNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/patient";
  try {
    const url = new URL(value, "https://clinic.invalid");
    if (url.origin !== "https://clinic.invalid" || url.hash) return "/patient";
    if (url.pathname === "/booking") {
      const doctor = url.searchParams.get("doctor");
      return doctor && /^\d{1,9}$/.test(doctor) && Number(doctor) > 0 ? `/booking?doctor=${doctor}` : "/booking";
    }
    if (url.pathname === "/patient") {
      const tab = url.searchParams.get("tab");
      return ["home", "profile", "address", "appointments"].includes(tab || "") ? `/patient?tab=${tab}` : "/patient";
    }
    return "/patient";
  } catch { return "/patient"; }
}
