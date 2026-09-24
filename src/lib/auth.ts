import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { cleanEnv } from "./slug";

const COOKIE = "tp_session";

function authSecret() {
  const secret = cleanEnv(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  if (secret.length < 16) {
    throw new Error("Falta AUTH_SECRET (o NEXTAUTH_SECRET) de al menos 16 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(authSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sessionUserId() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const id = await sessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { memberships: { include: { company: true } } },
  });
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) return null;
  return user;
}
