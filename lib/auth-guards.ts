import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      committeeId: true,
      isActive: true,
      mustChangePassword: true,
      phone: true,
      photoUrl: true,
      preferredLanguage: true,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect("/login?message=login-required");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) return { error: "Unauthorized", status: 401 as const };
  if (user.mustChangePassword && permission !== "profile.update.own") {
    return { error: "Password change required", status: 403 as const };
  }
  if (!hasPermission(user, permission)) return { error: "Forbidden", status: 403 as const };
  return { user };
}
