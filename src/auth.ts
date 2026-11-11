import NextAuth, { type NextAuthConfig, type NextAuthResult } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { getPrismaClient } from "@/lib/db";
import { findUserByEmail } from "@/lib/tenant/service";
import { verifyPasswordHash } from "@/lib/auth/password";
import { signInSchema } from "@/lib/validation/schemas";

function getLazyPrismaAdapter(): Adapter {
  let adapter: Adapter | null = null;

  return new Proxy({} as Adapter, {
    get(_target, property) {
      adapter ??= PrismaAdapter(getPrismaClient());
      return adapter[property as keyof Adapter];
    }
  });
}

function getOAuthProviders() {
  const githubClientId = process.env.AUTH_GITHUB_ID;
  const githubClientSecret = process.env.AUTH_GITHUB_SECRET;
  const googleClientId = process.env.AUTH_GOOGLE_ID;
  const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

  return [
    ...(githubClientId && githubClientSecret
      ? [
          GitHub({
            allowDangerousEmailAccountLinking: true,
            clientId: githubClientId,
            clientSecret: githubClientSecret
          })
        ]
      : []),
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            allowDangerousEmailAccountLinking: true,
            clientId: googleClientId,
            clientSecret: googleClientSecret
          })
        ]
      : [])
  ];
}

const authConfig: NextAuthConfig = {
  adapter: getLazyPrismaAdapter(),
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  },
  pages: {
    error: "/auth/error",
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(rawCredentials) {
        const parsed = signInSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email);

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await verifyPasswordHash(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          email: user.email,
          id: user.id,
          image: user.image,
          name: user.name
        };
      }
    }),
    ...getOAuthProviders()
  ],
  secret: process.env.AUTH_SECRET ?? "development-only-auth-secret-change-me",
  session: {
    strategy: "jwt"
  }
};

const nextAuth: NextAuthResult = NextAuth(authConfig);

export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
