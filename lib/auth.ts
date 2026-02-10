import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { users } from "./db";
import type { UserRole } from "./roles";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "password";
const TOKEN_NAME = "auth-token";
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  displayName: string;
  iat: number;
  exp: number;
}

/**
 * Verify user credentials against the users table.
 * Falls back to legacy password-only auth if no users exist (first-run compatibility).
 */
export async function verifyUser(username: string, password: string): Promise<JWTPayload | null> {
  // Try multi-user auth first
  const user = users.getByUsername(username);
  if (user) {
    if (!user.is_active) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    } as JWTPayload;
  }

  // Legacy fallback: if no users table entries exist, use DASHBOARD_PASSWORD
  const userCount = users.count();
  if (userCount === 0 && password === DASHBOARD_PASSWORD) {
    return {
      userId: "legacy",
      username: username || "admin",
      role: "FOUNDER" as UserRole,
      displayName: "Admin (Legacy)",
    } as JWTPayload;
  }

  return null;
}

/**
 * Generate JWT token with role information
 */
export function generateToken(payload: Pick<JWTPayload, "userId" | "username" | "role" | "displayName">): string {
  return jwt.sign(
    { userId: payload.userId, username: payload.username, role: payload.role, displayName: payload.displayName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Set auth cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

/**
 * Get auth token from cookies
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(TOKEN_NAME);
  return cookie?.value || null;
}

/**
 * Remove auth cookie
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

/**
 * Check if user is authenticated (for server components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  const payload = verifyToken(token);
  return payload !== null;
}

/**
 * Require authentication (throws error if not authenticated)
 */
export async function requireAuth(): Promise<JWTPayload> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("Invalid token");
  }

  return payload;
}

/**
 * Require specific role(s) — call after requireAuth()
 */
export function requireRole(payload: JWTPayload, ...allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(payload.role)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${payload.role}`);
  }
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
