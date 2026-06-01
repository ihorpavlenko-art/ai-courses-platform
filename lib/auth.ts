import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/password credentials for local development
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        name: { label: "Name", type: "text", placeholder: "Your Name" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        try {
          const email = credentials.email.trim().toLowerCase();
          const name = credentials.name?.trim() || email.split("@")[0];

          // Upsert user by email — creates account on first login, returns existing on subsequent
          const user = await prisma.user.upsert({
            where: { email },
            update: { lastLoginAt: new Date() },
            create: {
              googleId: `local_${email}`,
              name,
              email,
              avatarUrl: null,
              lastLoginAt: new Date(),
            },
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
          };
        } catch (error) {
          console.error("[Auth] Credentials authorize error:", error);
          return null;
        }
      },
    }),
    // Google OAuth (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For credentials provider, authorize() already handled the upsert
      if (account?.provider === "credentials") {
        return true;
      }

      // Google OAuth flow
      if (!profile?.sub || !profile?.email) {
        return false;
      }

      await prisma.user.upsert({
        where: { googleId: profile.sub },
        update: {
          lastLoginAt: new Date(),
          name: profile.name ?? "",
          avatarUrl: (profile as { picture?: string }).picture ?? null,
        },
        create: {
          googleId: profile.sub,
          name: profile.name ?? "",
          email: profile.email,
          avatarUrl: (profile as { picture?: string }).picture ?? null,
        },
      });

      return true;
    },
    async jwt({ token, user, profile }) {
      // For credentials provider, user object is passed directly from authorize()
      if (user?.id) {
        token.userId = user.id;
      }
      // For Google OAuth, look up by Google ID
      if (profile?.sub && !token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { googleId: profile.sub },
          select: { id: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
