import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "password";
const TOKEN_NAME = "auth-token";
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JWTPayload {
  username: string;
  iat: number;
  exp: number;
}

/**
 * Verify password against environment variable
 */
export async function verifyPassword(password: string): Promise<boolean> {
  // For simple password comparison, use direct string comparison
  // In production, you'd hash the password first
  return password === DASHBOARD_PASSWORD;
}

/**
 * Generate JWT token
 */
export function generateToken(username: string = "admin"): string {
  return jwt.sign(
    { username },
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
 * Require authentication (throws redirect if not authenticated)
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
