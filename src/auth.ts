import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { DEMO_USERS } from "@/lib/demo-data";
import { Role, Bureau } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the deployment proxy (Vercel / local `next start`). Auth.js only
  // auto-trusts hosts in development, which otherwise breaks production login.
  trustHost: true,
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

        // 1. Try querying PostgreSQL via Prisma
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email },
          });

          if (dbUser) {
            const isValid = await bcrypt.compare(password, dbUser.password_hash);
            if (isValid) {
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
          }
        } catch (dbErr) {
          // If database is currently unreachable, fallback to deterministic demo dataset
          console.warn("Database unreachable in auth authorize; using demo fallback.", dbErr);
        }

        // 2. Fallback to pre-configured DEMO_USERS
        const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === email);
        if (demoUser && demoUser.password === password) {
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
  },
  secret: process.env.AUTH_SECRET || "aicte_super_secret_jwt_key_2026_ver_prod_secure",
});
