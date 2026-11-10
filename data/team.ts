export type TeamMember = {
  name: string;
  role: string;
  roleAr: string;
  committee?: string;
  title?: string;
  description: string;
  descriptionAr: string;
  image?: string;
};

// Names and roles are taken from the existing team seed data.
export const team: TeamMember[] = [
  {
    name: "Baher Alaa",
    role: "Head, MT Club",
    roleAr: "رئيس نادي MT",
    description: "Bringing the club's people and ideas together.",
    descriptionAr: "يجمع أعضاء النادي وأفكارهم معًا.",
  },
  {
    name: "Laila Ziad",
    role: "Vice Head, MT Club",
    roleAr: "نائب رئيس نادي MT",
    description: "Helping the community learn and grow together.",
    descriptionAr: "تدعم المجتمع ليتعلّم وينمو معًا.",
  },
  {
    name: "Mahmoud Sameh",
    role: "Head, Tech",
    roleAr: "رئيس لجنة التقنية",
    description: "Leading the club's technology committee.",
    descriptionAr: "يقود لجنة التقنية في النادي.",
  },
  {
    name: "Ramadan Kamal",
    role: "Vice Head, Tech",
    roleAr: "نائب رئيس لجنة التقنية",
    description: "Building thoughtful technology experiences.",
    descriptionAr: "يساهم في بناء تجارب تقنية مدروسة.",
  },
];
