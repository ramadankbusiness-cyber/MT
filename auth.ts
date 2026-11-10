import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { hashIdentifier, requestIp } from "@/lib/security";
import { authenticateCredentials, LOGIN_WINDOW_MS } from "@/lib/login";

class DisabledAccountSignin extends CredentialsSignin {
  code = "account-disabled";
}

class LockedAccountSignin extends CredentialsSignin {
  constructor(minutes: number) {
    super();
    this.code = `try-again-${minutes}`;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  jwt: {
    encode: async (params) => encode({
      ...params,
      maxAge: params.token?.rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60,
    }),
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password, rememberMe } = parsed.data;
        const ipHash = hashIdentifier(requestIp(request));
        const result = await authenticateCredentials(
          { email, password, ipHash, rememberMe },
          {
            findUser: (normalizedEmail) => prisma.user.findUnique({ where: { email: normalizedEmail } }),
            recentFailures: async (normalizedEmail, hashedIp, since) => {
              const rows = await prisma.loginAttempt.findMany({
                where: { email: normalizedEmail, ipHash: hashedIp, succeeded: false, createdAt: { gte: since } },
                select: { createdAt: true },
                orderBy: { createdAt: "asc" },
              });
              return rows.map((row) => row.createdAt);
            },
            comparePassword: bcrypt.compare,
            recordAttempt: async (normalizedEmail, hashedIp, succeeded) => {
              await prisma.loginAttempt.create({ data: { email: normalizedEmail, ipHash: hashedIp, succeeded } });
            },
            dummyPasswordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6O4zjvMfN48QYQKae4S/Qyt8uBz8K",
          },
        );
        if ("failure" in result) {
          if (result.failure === "disabled") throw new DisabledAccountSignin();
          if (result.failure === "locked") throw new LockedAccountSignin(result.retryAfterMinutes ?? Math.ceil(LOGIN_WINDOW_MS / 60_000));
          return null;
        }
        return {
          id: result.account.id,
          name: result.account.name,
          email: result.account.email,
          role: result.account.role,
          committeeId: result.account.committeeId,
          mustChangePassword: result.account.mustChangePassword,
          sessionVersion: result.account.sessionVersion,
          rememberMe: result.rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.committeeId = user.committeeId;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        token.rememberMe = user.rememberMe ?? false;
      }
      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, committeeId: true, mustChangePassword: true, sessionVersion: true, isActive: true },
        });
        if (!currentUser?.isActive || currentUser.sessionVersion !== token.sessionVersion) return null;
        token.role = currentUser.role;
        token.committeeId = currentUser.committeeId;
        token.mustChangePassword = currentUser.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.role === "ADMIN" || token.role === "LEADER" || token.role === "MEMBER") {
          session.user.role = token.role;
        }
        session.user.committeeId = token.committeeId as string | null;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.id) {
        await prisma.user.updateMany({
          where: { id: message.token.id as string },
          data: { sessionVersion: { increment: 1 } },
        });
      }
    },
  },
});
