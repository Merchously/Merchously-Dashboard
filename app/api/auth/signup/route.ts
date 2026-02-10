import { NextRequest, NextResponse } from "next/server";
import { users } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { ROLES } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, password, role } = body;

    // Validate required fields
    if (!username || !displayName || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required: username, displayName, password, role" },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-z0-9._]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters, lowercase letters, numbers, dots, or underscores" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate role
    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check username uniqueness
    const existing = users.getByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Hash password and create user with is_active = 0 (pending approval)
    const password_hash = await hashPassword(password);
    const newUser = users.create({
      username,
      display_name: displayName,
      role,
      password_hash,
      is_active: 0,
    });

    broadcast({
      type: "user.signup_pending",
      data: {
        id: newUser.id,
        username: newUser.username,
        display_name: newUser.display_name,
        role: newUser.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created. Awaiting admin approval.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
