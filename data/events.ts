export type ClubEvent = {
  date: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  status: "Upcoming" | "Recent";
  statusAr: "قادم" | "حديث";
};

// Add confirmed club events here; no unverified event details are shown as fact.
export const events: ClubEvent[] = [];
