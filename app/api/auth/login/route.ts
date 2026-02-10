import { NextRequest, NextResponse } from "next/server";
import { verifyUser, generateToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Verify credentials (supports both multi-user and legacy single-password)
    const userPayload = await verifyUser(username || "admin", password);
    if (!userPayload) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token with role
    const token = generateToken(userPayload);

    // Set auth cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        username: userPayload.username,
        role: userPayload.role,
        displayName: userPayload.displayName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
