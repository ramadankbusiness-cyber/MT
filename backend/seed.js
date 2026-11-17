import { supabase } from "./config/supabase.js";

const DEFAULT_TEAM_ROWS = [
  { name: "", role: "Chairman", has_image: 0, sort_order: 0 },
  { name: "Baher Alaa", role: "Head MTC", has_image: 1, sort_order: 1 },
  { name: "Laila Ziad", role: "Vice Head MTC", has_image: 1, sort_order: 2 },
  { name: "", role: "Head OC", has_image: 0, sort_order: 3 },
  { name: "", role: "Vice Head OC", has_image: 0, sort_order: 4 },
  { name: "Mahmoud Sameh", role: "Head Tech", has_image: 1, sort_order: 5 },
  { name: "Ramadan Kamal", role: "Vice Head Tech", has_image: 1, sort_order: 6 },
  { name: "", role: "Head Logistics", has_image: 0, sort_order: 7 },
  { name: "", role: "Vice Head Logistics", has_image: 0, sort_order: 8 },
  { name: "", role: "Head Media", has_image: 0, sort_order: 9 },
  { name: "", role: "Vice Head Media", has_image: 0, sort_order: 10 },
  { name: "", role: "Head First Aid", has_image: 0, sort_order: 11 },
  { name: "", role: "Vice Head First Aid", has_image: 0, sort_order: 12 },
  { name: "", role: "Head HR", has_image: 0, sort_order: 13 },
  { name: "", role: "Vice Head HR", has_image: 0, sort_order: 14 },
  { name: "", role: "Head PR", has_image: 0, sort_order: 15 },
  { name: "", role: "Vice Head PR", has_image: 0, sort_order: 16 },
  { name: "", role: "Leader 1 OC", has_image: 0, sort_order: 17 },
  { name: "", role: "Leader 2 OC", has_image: 0, sort_order: 18 },
  { name: "", role: "Leader Logistics", has_image: 0, sort_order: 19 },
  { name: "", role: "Leader Tech", has_image: 0, sort_order: 22 },
  { name: "", role: "Leader PR", has_image: 0, sort_order: 23 },
  { name: "", role: "Leader First Aid", has_image: 0, sort_order: 24 },
  { name: "", role: "Leader Media", has_image: 0, sort_order: 25 },
  { name: "", role: "Leader 1 HR", has_image: 0, sort_order: 26 },
  { name: "", role: "Leader 2 HR", has_image: 0, sort_order: 27 },
];

export async function seedTeam() {
  try {
    if (!supabase) return;

    const { data: rows, error: fetchErr } = await supabase
      .from("team")
      .select("role")
      .order("id", { ascending: true });

    if (fetchErr) {
      if (fetchErr.code === "42P01" || fetchErr.code === "42703") {
        console.error("[Team] Table or column issue. Run migrations/ensure_team_table.sql in Supabase SQL Editor.");
      } else {
        console.error("[Team] Seed check error:", fetchErr.message, "code:", fetchErr.code);
      }
      return;
    }

    const existingRoles = new Set((rows || []).map(r => r.role));
    const missing = DEFAULT_TEAM_ROWS.filter(r => !existingRoles.has(r.role));

    if (missing.length > 0) {
      const { error: insertErr } = await supabase.from("team").insert(missing);
      if (insertErr) {
        console.error("[Team] Failed to seed missing team rows:", insertErr.message);
      } else {
        console.log(`[Team] Seeded ${missing.length} missing team rows.`);
      }
    } else {
      console.log("[Team] All team rows present.");
    }
  } catch (err) {
    console.error("[Team] Seed error:", err.message);
  }
}
