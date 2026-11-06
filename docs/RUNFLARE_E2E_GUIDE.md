# کلینیک آرامش — راهنمای آماده‌سازی E2E واقعی روی Runflare
> وضعیت: **ممیزی سندباکس متوقف شد.** این سند فقط **پیش‌نیازهای عملیاتی** که *شما* باید در داشبورد Runflare و پنل پیامکی انجام دهید را مرحله‌به‌مرحله توضیح می‌دهد.  
> هیچ Secret در کد/گیت قرار نگرفته و هیچ تغییری در دیتابیس/دامنه/سرویس خارجی بدون تأیید شما انجام نشده است. پروژه تا اجرای موفق E2E واقعی **«آماده انتشار قطعی» اعلام نمی‌شود.**

---

## ۱. نمای کلی وابستگی‌ها
| لایه | آنچه در سندباکس تأیید شد | آنچه فقط با اتصال واقعی قابل تأیید است |
|---|---|---|
| ثبت و لغو نوبت | کد تراکنش `FOR UPDATE` + یونیک ایندکس `appointments_slot_unique_idx` + `canCancelAppointment 120m` بررسی ایستا/یونیت پاس | رزرو واقعی، تراکنش همزمان `23505`, پیام `SLOT_TAKEN 409` |
| رقابت همزمان | کد `SELECT ... FOR UPDATE` روی `doctors` و `appointments` | دو رزرو موازی روی یک اسلات از دو نشست مختلف |
| OTP/پیامک | `HMAC-SHA256 + timingSafeEqual`, `300s/5attempts`, `rateLimit 20/ip + 3/phone` | ارسال واقعی به `rest.melipayamak.com` و دریافت کد روی گوشی |
| مجوزهای پنل | `can(user, "appointments.manage")` در ۱۲ مسیر + `RBAC` | لاگین با ۴ نقش واقعی و تست `403 vs 200` |
| Rate Limit | منطق `rateLimits.blockedUntil` در `security.ts` | `429` واقعی پس از عبور از آستانه |
| SMS اطلاع‌رسانی | `notificationRecipients + deliverAppointmentSms after()` | دریافت SMS تأیید/لغو روی گوشی منشی و بیمار |

**دلیل عدم تأیید در سندباکس:** `DATABASE_URL=postgresql://build_user:dummy` → `connection timeout` + خروجی مجاز فقط `github.com/registry.npmjs.org/pypi.org` → `rest.melipayamak.com` به `Could not resolve host` می‌خورد.

---

## ۲. پیش‌نیازهای داشبورد Runflare (شما انجام می‌دهید)

### ۲-۱. ساخت PostgreSQL
1. Runflare Console → **Databases** → **Create Database** → `PostgreSQL 16`.
2. نام: `aramash-clinic-prod` (یا دلخواه).
3. پس از ساخته شدن، **Connection String** را کپی کنید. فرمت:
   `postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`
4. هیچ migration را دستی اجرا نکنید — در مرحله ۴ با `drizzle-kit` انجام می‌شود.

### ۲-۲. ساخت App Service
1. Runflare → **Apps** → **Create App** → **From GitHub** → مخزن `discoveryweb/nursingclinic` شاخه `main` یا `arena/874469b2-nursingclinic` (جهت E2E شاخه دوم را انتخاب کنید).
2. Build: `Dockerfile` (Multi-stage موجود است، نیازی به تغییر نیست).
3. Port: `3000`, Healthcheck: `/api/health`.
4. **Deploy را فعلاً نزنید** — اول متغیرهای بخش بعد را پر کنید.

---

## ۳. چک‌لیست دقیق متغیرهای محیطی (Env)

> در Runflare: `App → Settings → Environment Variables` → همه را **Private/Secret** علامت بزنید. مقدارها را هرگز در گیت/لاگ/اسکرین‌شات عمومی نگذارید.

| متغیر | الزامی | فرمت / مثال | توضیح |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres:***@db-...runflare.com:5432/app_db?sslmode=require` | از مرحله ۲-۱. بدون `?sslmode=require` روی Runflare وصل نمی‌شود. |
| `OTP_SECRET` | ✅ | `openssl rand -hex 32` → ۶۴ هگز (≥۳۲ کاراکتر) | HMAC کدهای ورود. با هر بار تغییر، کدهای قبلی باطل می‌شوند. |
| `MELIPAYAMAK_USERNAME` | ✅ برای OTP واقعی | `5f8e...` از پنل melipayamak.com → وب‌سرویس → نام کاربری | ارائه‌دهنده اصلی. اگر خالی باشد سیستم به `503 SMS_UNAVAILABLE` می‌رود و کد فقط از پذیرش صادر می‌شود. |
| `MELIPAYAMAK_PASSWORD` | ✅ همراه بالایی | پسورد وب‌سرویس (نه پسورد پنل) | |
| `MELIPAYAMAK_FROM` | ✅ | `50004000...` خط خدماتی شما | باید در پنل تأییدشده باشد. |
| `MELIPAYAMAK_OTP_BODY_ID` | اختیاری ولی **توصیه اکید** | `123456` عددی | قالب خدماتی برای عبور از بلک‌لیست مخابرات. بدون آن OTP به خطوط مسدود نمی‌رسد. |
| `KAVENEGAR_API_KEY` | اختیاری | از پنل کاوه‌نگار | فقط Fallback؛ اگر ملی‌پیامک ست است استفاده نمی‌شود. |
| `KAVENEGAR_SENDER` | در صورت بالایی | `10008663` | |
| `ADMIN_USERNAME` | ✅ فقط اولین بوت | `admin` (حروف کوچک) | اگر `staff_users` خالی باشد و این دو ست باشند، `ensureSuperAdmin()` یک `super_admin` با `mustChangePassword=true` می‌سازد. بعد از اولین لاگین، این دو را از Env حذف/خالی کنید. |
| `ADMIN_PASSWORD` | ✅ همراه بالایی | `Str0ng!Passw0rd` (≥۸) | در اولین ورود اجبار به تغییر رمز دارید. |
| `NEXT_PUBLIC_SITE_URL` | توصیه | `https://clinic.yourdomain.ir` | برای `sitemap.xml/robots/canonical`. بدون آن `https://aramashclinic.example` فرض می‌شود. |
| `CLINIC_FRAME_ANCESTORS` | در صورت نیاز امنیتی | `'self' https://clinic.yourdomain.ir` | پیش‌فرض ما `*.e2b.app/*.runflare.com/*.arena.ai` است. برای لاک‌دان کامل `'self'` بگذارید. |
| `NODE_ENV` | خودکار | `production` | Runflare ست می‌کند. |

**تولید OTP_SECRET:**
```bash
openssl rand -hex 32
# نمونه: 9f3d1a8e7c4b5d6e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2
```

---

## ۴. Migration و Seed دیتابیس

> بدون این مرحله، هیچ E2E واقعی اجرا نمی‌شود.

1. در ترمینال لوکال با دسترسی به `DATABASE_URL` واقعی:
```bash
npm ci
# تست اتصال
DATABASE_URL="postgresql://..." npm run build  # باید بدون dummy بسازد
npx drizzle-kit generate  # اگر drizzle/ وجود ندارد، فقط برای اطمینان
npx drizzle-kit migrate   # یا: npx drizzle-kit push  (drizzle.config.ts از DATABASE_URL می‌خواند)
```
2. جدول‌ها ساخته شد: `doctors, patients, staff_users, appointments (unique idx), reviews, notifications, settings, sessions, rateLimits, loginAttempts, phoneVerifications, auditLogs`.
3. (اختیاری برای E2E) سید اولیه:
```bash
npx tsx src/db/seed.ts  # ۶ دکتر نمونه با تصاویر /public/images/doctor-*.jpg
```
در پروداکشن واقعی، پزشکان را از پنل `Admin → متخصصان` بسازید، نه با سید عمومی.

---

## ۵. سرویس پیامکی — قبل از تست E2E

**Melipayamak (اصلی):**
1. melipayamak.com → ثبت‌نام خدماتی → احراز هویت → **وب‌سرویس آزمایشگاهی** را فعال کنید.
2. یک **خط خدماتی** (مثلاً ۵۰۰۰۴) بگیرید و در `MELIPAYAMAK_FROM` بگذارید.
3. برای عبور از بلک‌لیست: **قالب خدماتی** بسازید: متن `کد تایید شما {0}` → پس از تأیید مخابرات، `MELIPAYAMAK_OTP_BODY_ID` را پر کنید.
4. موجودی شارژ را چک کنید (OTP هر بار ۱ پیامک؛ اطلاع‌رسانی هر نوبت به ازای هر منشی ۱ پیامک).

**KaveNegar (فقط ذخیره):** در صورت تمایل، از پنل کاوه‌نگار `API_KEY` + `SENDER` بگیرید؛ کد به‌صورت خودکار در صورت نبود Melipayamak به آن سوییچ می‌کند.

**تست اتصال (ایمن):**
```bash
curl -X POST https://rest.melipayamak.com/v1/SendSMS \
 -H "Content-Type: application/json" \
 -d '{"username":"***","password":"***","from":"50004","to":"09190000001","text":"تست اتصال آرامش"}'
# انتظار: {"Value":"...","RetStatus":1}
```
این را فقط با شماره تست اختصاصی خود بزنید، نه شماره بیماران واقعی.

---

## ۶. برنامه تست E2E ایمن (برای موارد تأییدنشده)

> **اصل ایمنی:** همه تست‌ها با **داده‌های اختصاصی آزمایش** انجام شود. از شماره/نام بیماران واقعی استفاده نکنید. شماره‌های پیشنهادی: `09190000001..09190000005` (ایرانسل تستی). نام‌ها: `کاربر آزمون ۱` و ...

### سناریو ۱: ثبت نوبت
- پیش‌شرط: دکتر فعال با `workDays` شامل فردا، اسلات خالی.
- گام: `/patient/login` → شماره تست → کد از SMS/پنل پذیرش (دکمه «صدور کد تلفنی») → تکمیل پروفایل → `/booking?doctor=1` → انتخاب فردا + ساعت آزاد → ثبت.
- انتظار: `201 {appointment:{id,status:"pending"}}` + ردیف `dashboard sent` + `sms pending` برای منشی‌ها.
- شکست: `409 SLOT_TAKEN` اگر اسلات پر باشد (درست است).

### سناریو ۲: رقابت همزمان (بحرانی‌ترین)
- پیش‌شرط: یک اسلات خالی (مثلاً `10:00 فردا`).
- گام: همزمان از دو مرورگر/کوکی متفاوت (دو بیمار تست متفاوت) `POST /api/appointments` با `doctorId=1, date=فردا, time=10:00` بزنید.
- انتظار: یکی `201`، دیگری `409 SLOT_TAKEN` با پیام «این زمان به‌تازگی رزرو شده». در DB فقط یک ردیف `status<>'cancelled'` بماند (یونیک ایندکس).
- ابزار: می‌توانید از `k6` یا دو تب ناشناس استفاده کنید.

### سناریو ۳: لغو تا ۲ ساعت
- پیش‌شرط: نوبت برای ۳ ساعت بعد.
- گام: `POST /api/patient/appointments/[id]/cancel` → `200 ok`; نوبت برای ۱ ساعت بعد → `400 "تا دو ساعت پیش از نوبت"` و پیشنهاد تماس.
- انتظار: پس از لغو، `dashboard + sms` جدید برای منشی ثبت شود.

### سناریو ۴: OTP و Rate Limit
- `POST /api/patient/verification/send {phone:"09190000001", purpose:"login"}` → `200 {expiresIn:300}`؛ ۴ بار پیاپی → `429`؛ کد اشتباه ۵ بار → `400 attempts exceeded`; کد درست → `200 ok` + کوکی `clinic_patient_session` + `patients.phoneVerified=true`.
- بررسی `phoneVerifications.codeHash` با `timingSafeEqual` (کد قبلاً یونیت پاس).

### سناریو ۵: مجوزهای پنل
- با `secretary` لاگین → `GET /api/admin/doctors → 403`، `GET /api/admin/appointments → 200`; با `specialist` → فقط نوبت‌های خودش; با `super_admin` → همه `200`; تست `audit.view` و `settings.manage`.
- بدون `sameOrigin` → `POST` باید `403 "درخواست نامعتبر"` بدهد.

### سناریو ۶: پیامک اطلاع‌رسانی
- پس از هر `POST /api/appointments` یا `cancel`، جدول `notifications where channel='sms'` را چک کنید: `status pending→sent` و `providerResponse` شامل `ملی‌پیامک: {"RetStatus":1}`. در پنل `Admin → اعلان‌ها` دکمه «تلاش دوباره» باید `POST /api/admin/notifications/[id]/retry` را `200` کند.

**لاگ امن:** هرگز `OTP_SECRET`, `DATABASE_URL`, `MELIPAYAMAK_PASSWORD` را در چت/گیت/اسکرین‌شات نگذارید. شماره‌های تست را بعد از E2E از `patients/appointments` اگر خواستید پاک کنید (ولی برای حسابرسی بهتر نگه دارید).

---

## ۷. چک عملیاتی نهایی (شما پس از Deploy چک می‌کنید)
- `/api/health` → `200 {ok:true}` (اگر DB وصل است)
- هدرها: `curl -I https://yourdomain/` → `Content-Security-Policy frame-ancestors ...`, `Strict-Transport-Security`, `Cache-Control: no-store, private` روی `/api/*`
- `/sitemap.xml` شامل `/, /booking, /doctors/:id` و `/robots.txt` با `Disallow: /admin/` + `Sitemap:`
- مرورگر: `tel:` روی Navbar باید `tel:02144556677` باشد (نه خالی)
- پنل: `Admin → گزارش فعالیت` پس از هر تست، ردیف جدید داشته باشد.

---

## ۸. چه کاری از من نخواهید
- من **هیچ** Secret را به کد اضافه نمی‌کنم، هیچ Migration را بدون تأیید شما روی DB واقعی اجرا نمی‌کنم و دامنه/سرویس خارجی را تغییر نمی‌دهم.
- تا وقتی ۶ سناریوی بالا با مدرک لاگ/اسکرین‌شات واقعی پاس نشود، وضعیت را «آماده انتشار قطعی» اعلام نمی‌کنم.

**گام بعدی شما:** موارد بخش ۲ و ۳ را در Runflare انجام دهید و نتیجه `curl`های بخش ۷ را برایم بفرستید تا مرحله E2E را با شما جلو ببرم.
