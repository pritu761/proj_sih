import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { DEMO_USERS } from "@/lib/demo-data";
import { Role, Bureau } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/services/audit";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/rate-limit";

// Production deployments must provide an explicit secret. The development
// fallback only keeps `npm run dev` frictionless; it is never used in
// production, so a public default can never sign live sessions.
const DEV_ONLY_AUTH_SECRET =
  "aicte_sentinel_local_dev_only_secret_do_not_use_in_production";

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : DEV_ONLY_AUTH_SECRET);

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is required in production. Generate one with `openssl rand -base64 32` and set it in the deployment environment."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the deployment proxy (Vercel / local `next start`). Auth.js only
  // auto-trusts hosts in development, which otherwise breaks production login.
  // Combined with same-origin redirects below, this keeps auth URLs on the
  // deployment origin instead of a stale localhost value.
  trustHost: true,
  secret: authSecret,
  providers: [
    Credentials({
      name: "AICTE Credentials",
      credentials: {
        email: { label: "AICTE Official Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        const rateLimitKey = `credentials:${email}`;

        const limit = checkLoginRateLimit(rateLimitKey);
        if (!limit.allowed) {
          console.warn(`Login rate limit reached for ${email}.`);
          return null;
        }

        // 1. Try querying PostgreSQL via Prisma
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email },
          });

          if (dbUser) {
            const isValid = await bcrypt.compare(password, dbUser.password_hash);
            if (isValid) {
              clearLoginFailures(rateLimitKey);
              return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role as Role,
                bureau: dbUser.bureau as Bureau,
                region: dbUser.region,
                designation: dbUser.designation,
              };
            }

            // A known account with a wrong password must not fall through to
            // the demo credential list.
            recordLoginFailure(rateLimitKey);
            return null;
          }
        } catch (dbErr) {
          // If database is currently unreachable, fallback to deterministic demo dataset
          console.warn("Database unreachable in auth authorize; using demo fallback.", dbErr);
        }

        // 2. Fallback to pre-configured DEMO_USERS
        const demoUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email);
        if (demoUser && demoUser.password === password) {
          clearLoginFailures(rateLimitKey);
          return {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            role: demoUser.role,
            bureau: demoUser.bureau,
            region: demoUser.region ?? null,
            designation: demoUser.designation,
          };
        }

        recordLoginFailure(rateLimitKey);
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8-hour official shift session
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.bureau = (user as any).bureau;
        token.region = (user as any).region;
        token.designation = (user as any).designation;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as Role;
        (session.user as any).bureau = token.bureau as Bureau;
        (session.user as any).region = token.region as string | null;
        (session.user as any).designation = token.designation as string | null;
      }
      return session;
    },
    /**
     * Only allow redirects that stay on the deployment origin. This prevents
     * an absolute auth URL (for example a stale `http://localhost:3000`) from
     * ever being used for post-login/logout navigation.
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === new URL(baseUrl).origin) return url;
      } catch {
        // Fall through to the base URL for malformed values.
      }
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      await logAuditEvent({
        user: user.email ?? "unknown",
        action: "LOGIN",
        entity: "Session",
        entity_id: user.id ?? user.email ?? "unknown",
        after: {
          role: (user as any).role ?? null,
          bureau: (user as any).bureau ?? null,
        },
      });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const email = (token?.email as string | undefined) ?? "unknown";
      await logAuditEvent({
        user: email,
        action: "LOGOUT",
        entity: "Session",
        entity_id: (token?.id as string | undefined) ?? email,
        after: { role: token?.role ?? null },
      });
    },
  },
});
