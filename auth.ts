import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { hashIdentifier, requestIp } from "@/lib/security";
import { authenticateCredentials, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } from "@/lib/login";

class DisabledAccountSignin extends CredentialsSignin {
  code = "account-disabled";
}

class LockedAccountSignin extends CredentialsSignin {
  constructor(minutes: number) {
    super();
    this.code = `try-again-${minutes}`;
  }
}

class UnexpectedLoginSignin extends CredentialsSignin {
  constructor(errorId: string) {
    super();
    this.code = `login-error-${errorId}`;
  }
}

const isLocalSqliteDevelopment =
  process.env.NODE_ENV !== "production" &&
  (process.env.DATABASE_PROVIDER === "sqlite" || process.env.DATABASE_URL?.startsWith("file:") === true);
const localLoginFailures = new Map<string, Date[]>();

function unexpectedLoginSignin(error: unknown): UnexpectedLoginSignin {
  const errorId = randomUUID().slice(0, 8);
  if (process.env.NODE_ENV === "development") {
    const details = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...("code" in error && typeof error.code === "string" ? { code: error.code } : {}),
          ...("clientVersion" in error && typeof error.clientVersion === "string"
            ? { clientVersion: error.clientVersion }
            : {}),
        }
      : error;
    console.error(`[auth] Login failed (${errorId})`, details);
  } else {
    console.error(`[auth] Login failed (${errorId})`);
  }
  return new UnexpectedLoginSignin(errorId);
}

function logLoginStep(step: string) {
  if (process.env.NODE_ENV === "development" && process.env.AUTH_DEBUG_LOGIN === "true") {
    console.info(`[auth][debug] ${step}`);
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
        logLoginStep("credentials authorization started");
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          logLoginStep("credentials validation rejected the request");
          return null;
        }
        const { email, password, rememberMe } = parsed.data;
        const ipHash = hashIdentifier(requestIp(request));
        let result: Awaited<ReturnType<typeof authenticateCredentials>>;
        try {
          result = await authenticateCredentials(
            { email, password, ipHash, rememberMe },
            {
              findUser: async (normalizedEmail) => {
                logLoginStep("querying account");
                const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                logLoginStep(`account query completed; found=${!!user}`);
                return user;
              },
              recentFailures: async (normalizedEmail, hashedIp, since) => {
                if (isLocalSqliteDevelopment) {
                  const key = `${normalizedEmail}:${hashedIp}`;
                  const failures = (localLoginFailures.get(key) ?? []).filter((date) => date >= since);
                  localLoginFailures.set(key, failures);
                  return failures;
                }
                logLoginStep("querying recent login attempts");
                const rows = await prisma.loginAttempt.findMany({
                  where: { email: normalizedEmail, ipHash: hashedIp, succeeded: false, createdAt: { gte: since } },
                  select: { createdAt: true },
                  orderBy: { createdAt: "asc" },
                });
                logLoginStep(`login-attempt query completed; count=${rows.length}`);
                return rows.map((row) => row.createdAt);
              },
              comparePassword: async (candidate, hash) => {
                logLoginStep("checking password hash");
                const matches = await bcrypt.compare(candidate, hash);
                logLoginStep("password hash check completed");
                return matches;
              },
              recordAttempt: async (normalizedEmail, hashedIp, succeeded) => {
                if (isLocalSqliteDevelopment) {
                  if (!succeeded) {
                    const key = `${normalizedEmail}:${hashedIp}`;
                    const since = new Date(Date.now() - LOGIN_WINDOW_MS);
                    const failures = (localLoginFailures.get(key) ?? []).filter((date) => date >= since);
                    failures.push(new Date());
                    localLoginFailures.set(key, failures.slice(-LOGIN_MAX_ATTEMPTS));
                  }
                  logLoginStep("local SQLite login attempt recorded in memory");
                  return;
                }
                logLoginStep("recording login attempt");
                await prisma.loginAttempt.create({ data: { email: normalizedEmail, ipHash: hashedIp, succeeded } });
                logLoginStep("login attempt recorded");
              },
              dummyPasswordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6O4zjvMfN48QYQKae4S/Qyt8uBz8K",
            },
          );
        } catch (error) {
          throw unexpectedLoginSignin(error);
        }
        logLoginStep("credential authentication completed");
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
        let currentUser;
        try {
          currentUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, committeeId: true, mustChangePassword: true, sessionVersion: true, isActive: true },
          });
        } catch (error) {
          throw unexpectedLoginSignin(error);
        }
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
        if (isLocalSqliteDevelopment) {
          logLoginStep("skipping persistent session revocation for local SQLite development");
          return;
        }
        await prisma.user.updateMany({
          where: { id: message.token.id as string },
          data: { sessionVersion: { increment: 1 } },
        });
      }
    },
  },
});
