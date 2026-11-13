import dotenv from "dotenv";
import { PrismaClient } from "../lib/generated/prisma";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const COMMITTEES = [
  {
    key: "oc",
    name: "OC",
    nameAr: "اللجنة التنظيمية",
    descriptionEn: "Plans and runs our events from the first idea to the last detail: schedules, venues, speakers, and everything that makes an event run smoothly.",
    descriptionAr: "بتخطط وتنفّذ فعالياتنا من أول فكرة لآخر تفصيلة: الجداول، الأماكن، المتحدثين، وكل اللي يخلي الفعالية تمشي بسلاسة.",
    order: 1,
  },
  {
    key: "hr",
    name: "HR",
    nameAr: "الموارد البشرية",
    descriptionEn: "Takes care of our people. Recruits and onboards new members, tracks attendance and engagement, and keeps the club a supportive, well-organized community.",
    descriptionAr: "بتهتم بأعضاء النادي. باستقطاب الأعضاء الجدد واستقبالهم، ومتابعة الحضور والتفاعل، والحفاظ على مجتمع منظّم وداعم.",
    order: 2,
  },
  {
    key: "pr",
    name: "PR",
    nameAr: "العلاقات العامة",
    descriptionEn: "Builds relationships outside the club. Reaches out to sponsors, partners and other organizations, and represents MT Club professionally.",
    descriptionAr: "بتبني علاقات النادي مع الخارج. بتتواصل مع الرعاة والشركاء والجهات الأخرى وتمثّل MT Club بشكل احترافي.",
    order: 3,
  },
  {
    key: "tech",
    name: "Tech",
    nameAr: "اللجنة التقنية",
    descriptionEn: "Builds and maintains our digital tools, including the website and internal systems, and supports other committees with technical solutions.",
    descriptionAr: "بتبني وتصون أدواتنا الرقمية، زي الموقع والأنظمة الداخلية، وبتدعم باقي اللجان بحلول تقنية.",
    order: 4,
  },
  {
    key: "logistics",
    name: "Logistics",
    nameAr: "اللوجستيات",
    descriptionEn: "Prepares everything physical behind the scenes: equipment, setup, transportation, supplies and the venue, so each event has what it needs on time.",
    descriptionAr: "بتجهّز كل اللي ورا الكواليس: المعدات، التجهيز، المواصلات، المستلزمات والمكان، عشان كل فعالية تلاقي اللي تحتاجه في وقته.",
    order: 5,
  },
  {
    key: "media",
    name: "Media",
    nameAr: "الميديا",
    descriptionEn: "Tells the story of the club through design, photography, video and social media, and keeps our visual identity consistent.",
    descriptionAr: "بتحكي قصة النادي بالتصميم والتصوير والفيديو والسوشيال ميديا، وبتحافظ على هويتنا البصرية.",
    order: 6,
  },
  {
    key: "firstaid",
    name: "First Aid",
    nameAr: "الإسعافات الأولية",
    descriptionEn: "Keeps everyone safe at our events. Trained members provide first aid, handle emergencies calmly, and make sure safety standards are respected.",
    descriptionAr: "بتحافظ على سلامة الجميع في فعالياتنا. أعضاء مدرّبين بيقدموا الإسعافات ويتعاملوا مع الطوارئ بهدوء ويتأكدوا من تطبيق معايير الأمان.",
    order: 7,
  },
];

async function main() {
  for (const committee of COMMITTEES) {
    await prisma.committee.upsert({
      where: { key: committee.key },
      update: {
        name: committee.name,
        nameAr: committee.nameAr,
        descriptionEn: committee.descriptionEn,
        descriptionAr: committee.descriptionAr,
        order: committee.order,
      },
      create: {
        key: committee.key,
        name: committee.name,
        nameAr: committee.nameAr,
        descriptionEn: committee.descriptionEn,
        descriptionAr: committee.descriptionAr,
        order: committee.order,
      },
    });
    console.info(`Seeded committee: ${committee.key} (${committee.name})`);
  }
  console.info(`Seeded ${COMMITTEES.length} committees.`);
}

main()
  .catch((error) => {
    console.error("Committee seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
