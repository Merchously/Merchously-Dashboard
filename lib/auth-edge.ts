import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

/**
 * Verify JWT token (Edge Runtime compatible)
 * Used by middleware.ts — do NOT import jsonwebtoken here.
 */
export async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
