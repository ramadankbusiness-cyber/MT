export const CLUB_COMMITTEES = ["OC", "HR", "PR", "Tech", "Logistics", "Media", "First Aid"] as const;

export type ClubCommittee = (typeof CLUB_COMMITTEES)[number];
export type CommitteeIcon = "CalendarCheck" | "Users" | "Handshake" | "Code2" | "Truck" | "Camera" | "HeartPulse" | "Shield";
export const COMMITTEE_KEYS = ["oc", "hr", "pr", "tech", "logistics", "media", "firstaid"] as const;

export type CommitteeType = "committee" | "board";
export type CommitteeSourceEntry = {
  id?: string;
  key: string;
  name: string;
  nameAr: string;
  order: number;
  type: CommitteeType;
};

export const MTC_COMMITTEE: CommitteeSourceEntry = {
  key: "mtc",
  name: "MTC",
  nameAr: "MTC",
  order: -1,
  type: "board",
};

export const committeeDetails: Record<ClubCommittee, {
  key: (typeof COMMITTEE_KEYS)[number];
  nameAr: string;
  fullName: string;
  fullNameAr: string;
  description: string;
  descriptionAr: string;
  icon: CommitteeIcon;
}> = {
  OC: {
    key: "oc",
    nameAr: "OC",
    fullName: "Organizing Committee",
    fullNameAr: "اللجنة التنظيمية",
    description: "Plans and runs our events from the first idea to the last detail: schedules, venues, speakers, and everything that makes an event run smoothly.",
    descriptionAr: "بتخطط وتنفّذ فعالياتنا من أول فكرة لآخر تفصيلة: الجداول، الأماكن، المتحدثين، وكل اللي يخلي الفعالية تمشي بسلاسة.",
    icon: "CalendarCheck",
  },
  HR: {
    key: "hr",
    nameAr: "HR",
    fullName: "Human Resources",
    fullNameAr: "الموارد البشرية",
    description: "Takes care of our people. Recruits and onboards new members, tracks attendance and engagement, and keeps the club a supportive, well-organized community.",
    descriptionAr: "بتهتم بأعضاء النادي. بتستقطب الأعضاء الجدد وتستقبلهم، وتتابع الحضور والتفاعل، وتحافظ على مجتمع منظّم وداعم.",
    icon: "Users",
  },
  PR: {
    key: "pr",
    nameAr: "PR",
    fullName: "Public Relations",
    fullNameAr: "العلاقات العامة",
    description: "Builds relationships outside the club. Reaches out to sponsors, partners and other organizations, and represents MT Club professionally.",
    descriptionAr: "بتبني علاقات النادي مع الخارج. بتتواصل مع الرعاة والشركاء والجهات الأخرى وتمثّل MT Club بشكل احترافي.",
    icon: "Handshake",
  },
  Tech: {
    key: "tech",
    nameAr: "Tech",
    fullName: "Technology",
    fullNameAr: "اللجنة التقنية",
    description: "Builds and maintains our digital tools, including the website and internal systems, and supports other committees with technical solutions.",
    descriptionAr: "بتبني وتصون أدواتنا الرقمية، زي الموقع والأنظمة الداخلية، وبتدعم باقي اللجان بحلول تقنية.",
    icon: "Code2",
  },
  Logistics: {
    key: "logistics",
    nameAr: "Logistics",
    fullName: "Logistics",
    fullNameAr: "اللوجستيات",
    description: "Prepares everything physical behind the scenes: equipment, setup, transportation, supplies and the venue, so each event has what it needs on time.",
    descriptionAr: "بتجهّز كل اللي ورا الكواليس: المعدات، التجهيز، المواصلات، المستلزمات والمكان، عشان كل فعالية تلاقي اللي تحتاجه في وقته.",
    icon: "Truck",
  },
  Media: {
    key: "media",
    nameAr: "Media",
    fullName: "Media",
    fullNameAr: "الميديا",
    description: "Tells the story of the club through design, photography, video and social media, and keeps our visual identity consistent.",
    descriptionAr: "بتحكي قصة النادي بالتصميم والتصوير والفيديو والسوشيال ميديا، وبتحافظ على هويتنا البصرية.",
    icon: "Camera",
  },
  "First Aid": {
    key: "firstaid",
    nameAr: "First Aid",
    fullName: "First Aid",
    fullNameAr: "الإسعافات الأولية",
    description: "Keeps everyone safe at our events. Trained members provide first aid, handle emergencies calmly, and make sure safety standards are respected.",
    descriptionAr: "بتحافظ على سلامة الجميع في فعالياتنا. أعضاء مدرّبين بيقدموا الإسعافات ويتعاملوا مع الطوارئ بهدوء ويتأكدوا من تطبيق معايير الأمان.",
    icon: "HeartPulse",
  },
};

export function getCommittees(options?: { includeMTC?: boolean }): CommitteeSourceEntry[] {
  const regular: CommitteeSourceEntry[] = CLUB_COMMITTEES.map((name, index) => ({
    key: committeeDetails[name].key,
    name,
    nameAr: committeeDetails[name].nameAr,
    order: index + 1,
    type: "committee",
  }));
  return options?.includeMTC ? [MTC_COMMITTEE, ...regular] : regular;
}

export const POSITION_VALUES = ["HEAD", "VICE", "LEADER"] as const;
export type PositionLevel = (typeof POSITION_VALUES)[number];
export const POSITION_ORDER: Record<PositionLevel, number> = { HEAD: 0, VICE: 1, LEADER: 2 };
export const POSITION_LABELS: Record<PositionLevel, { en: string; ar: string }> = {
  HEAD: { en: "Head", ar: "هيد" },
  VICE: { en: "Vice", ar: "فايس" },
  LEADER: { en: "Leader", ar: "ليدر" },
};

export function getPositionLabel(position: PositionLevel | string | null | undefined, language: "en" | "ar") {
  if (!position || !(position in POSITION_LABELS)) return "";
  return POSITION_LABELS[position as PositionLevel][language];
}

export function suggestTitle(position: PositionLevel, group: "MTC" | string, language: "en" | "ar" = "en") {
  const pos = POSITION_LABELS[position][language];
  if (group === "MTC") {
    if (language === "ar") return `${pos} MTC`;
    if (position === "HEAD") return "HEAD MTC";
    if (position === "VICE") return "VICE MTC";
    return "LEADER MTC";
  }
  return language === "ar" ? `${pos} ${group}` : `${pos} of ${group}`;
}

export function getCommitteeLabel(name: string | null | undefined, language: "en" | "ar") {
  if (!name) return "";
  if (name === "MTC") return "MTC";
  const committee = CLUB_COMMITTEES.find((entry) => entry === name);
  if (!committee) return name;
  return language === "ar" ? committeeDetails[committee].fullNameAr : committee;
}
