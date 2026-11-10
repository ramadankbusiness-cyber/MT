import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-guards";
import { team as fallbackTeam } from "@/data/team";
import { TeamManager, type ManagedTeamMember } from "@/components/team-manager";
import { TeamDirectory } from "@/components/team-directory";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

export default async function TeamPage() {
  const user = process.env.DATABASE_URL ? await getCurrentUser() : null;
  const isAdmin = user?.role === "ADMIN" && !!user.isActive && !user.mustChangePassword;
  let members: ManagedTeamMember[] = [];
  let committees: { id: string; name: string }[] = [];
  if (process.env.DATABASE_URL) {
    const [databaseMembers, databaseCommittees] = await Promise.all([
      prisma.teamMember.findMany({
        where: isAdmin ? {} : { visible: true },
        include: { committee: { select: { name: true } } },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      isAdmin ? listClubCommittees() : Promise.resolve([]),
    ]);
    members = databaseMembers.map((member) => {
      const links = member.socialLinks && typeof member.socialLinks === "object" && !Array.isArray(member.socialLinks)
        ? member.socialLinks as Record<string, unknown>
        : null;
      return {
        ...member,
        socialLinks: links ? {
          website: typeof links.website === "string" ? links.website : undefined,
          linkedin: typeof links.linkedin === "string" ? links.linkedin : undefined,
          instagram: typeof links.instagram === "string" ? links.instagram : undefined,
        } : null,
      };
    });
    committees = databaseCommittees;
  }
  const staticFallback = !process.env.DATABASE_URL
    ? fallbackTeam.map((member, index) => ({
      id: `static-${index}`, name: member.name, title: member.title || member.role,
      titleAr: member.roleAr,
      committeeId: "", committee: { name: member.committee || "OC" }, bio: member.description,
      bioAr: member.descriptionAr,
      socialLinks: null, photoUrl: member.image || null, order: index, visible: true, userId: null,
    }))
    : [];
  const publicMembers = process.env.DATABASE_URL ? members.filter((member) => member.visible) : staticFallback;
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <TeamDirectory members={publicMembers} />
      </section>
      {isAdmin && <div className="content-section team-manager-section"><TeamManager initialMembers={members} committees={committees} /></div>}
    </main>
  );
}
