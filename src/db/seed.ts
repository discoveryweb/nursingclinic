import "dotenv/config";
import { db, pool } from "@/db";
import { doctors } from "@/db/schema";

const seedDoctors = [
  {
    name: "خانم مریم احمدی",
    specialty: "پرستار مراقبت در منزل سالمندان",
    bio: "بیش از ۱۲ سال سابقه در مراقبت تخصصی از سالمندان، کنترل علائم حیاتی و همراهی روزانه در منزل.",
    imageUrl: "/images/doctor-1.jpg",
    experienceYears: 12,
    workDays: [6, 0, 1, 2, 3],
    startTime: "08:00",
    endTime: "16:00",
    slotMinutes: 30,
    displayOrder: 1,
  },
  {
    name: "آقای علی رضایی",
    specialty: "پرستار تزریقات و سرم‌تراپی",
    bio: "متخصص تزریقات، سرم‌تراپی و نمونه‌گیری در محل با رعایت کامل اصول استریل و بی‌دردی.",
    imageUrl: "/images/doctor-2.jpg",
    experienceYears: 8,
    workDays: [6, 0, 1, 2, 3, 4],
    startTime: "09:00",
    endTime: "19:00",
    slotMinutes: 20,
    displayOrder: 2,
  },
  {
    name: "خانم سارا کریمی",
    specialty: "مراقبت از نوزاد و مادر",
    bio: "کارشناس مراقبت‌های پس از زایمان، آموزش شیردهی و مراقبت تخصصی از نوزاد در منزل.",
    imageUrl: "/images/doctor-3.jpg",
    experienceYears: 7,
    workDays: [6, 0, 1, 2, 3],
    startTime: "08:30",
    endTime: "15:30",
    slotMinutes: 30,
    displayOrder: 3,
  },
  {
    name: "آقای حسین نوری",
    specialty: "فیزیوتراپی و توانبخشی در منزل",
    bio: "ارائه خدمات فیزیوتراپی، توانبخشی بعد از جراحی و تمرینات حرکتی اختصاصی در منزل بیمار.",
    imageUrl: "/images/doctor-4.jpg",
    experienceYears: 10,
    workDays: [6, 0, 1, 3, 4],
    startTime: "10:00",
    endTime: "18:00",
    slotMinutes: 45,
    displayOrder: 4,
  },
  {
    name: "خانم نگار محمدی",
    specialty: "پانسمان و مراقبت از زخم",
    bio: "متخصص پانسمان تخصصی زخم‌های دیابتی، بستر و بعد از جراحی با جدیدترین روش‌های درمانی.",
    imageUrl: "/images/doctor-5.jpg",
    experienceYears: 9,
    workDays: [6, 0, 1, 2, 4],
    startTime: "09:00",
    endTime: "17:00",
    slotMinutes: 30,
    displayOrder: 5,
  },
  {
    name: "آقای امیر صادقی",
    specialty: "پرستار اعزامی اورژانس خانگی",
    bio: "اعزام سریع پرستار به منزل جهت رسیدگی به موارد حاد، کنترل درد و مراقبت‌های ویژه.",
    imageUrl: "/images/doctor-6.jpg",
    experienceYears: 11,
    workDays: [6, 0, 1, 2, 3, 4, 5],
    startTime: "07:00",
    endTime: "20:00",
    slotMinutes: 30,
    displayOrder: 6,
  },
];

async function main() {
  const existing = await db.select().from(doctors);
  if (existing.length > 0) {
    console.log(`Doctors already seeded (${existing.length} rows). Skipping.`);
    return;
  }

  await db.insert(doctors).values(seedDoctors);
  console.log(`Seeded ${seedDoctors.length} doctors.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
