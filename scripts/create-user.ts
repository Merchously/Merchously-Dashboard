/**
 * Create a user in the Merchously dashboard.
 * Usage: npx tsx scripts/create-user.ts <username> <password> <role> <display_name>
 *
 * Roles: FOUNDER, SALES_LEAD, DELIVERY_LEAD, CREATIVE_SPECIALIST, AI_OPERATOR
 *
 * Example:
 *   npx tsx scripts/create-user.ts julius mypassword FOUNDER "Julius Joaquin"
 */

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const VALID_ROLES = ["FOUNDER", "SALES_LEAD", "DELIVERY_LEAD", "CREATIVE_SPECIALIST", "AI_OPERATOR"];

async function main() {
  const [, , username, password, role, ...displayNameParts] = process.argv;
  const displayName = displayNameParts.join(" ");

  if (!username || !password || !role || !displayName) {
    console.error("Usage: npx tsx scripts/create-user.ts <username> <password> <role> <display_name>");
    console.error(`Roles: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "db", "merchously.db");
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure schema exists
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, "utf8"));
  }

  // Check if user already exists
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    console.error(`User '${username}' already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, username, display_name, role, password_hash, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, username, displayName, role, passwordHash);

  console.log(`User created successfully:`);
  console.log(`  ID:           ${id}`);
  console.log(`  Username:     ${username}`);
  console.log(`  Display Name: ${displayName}`);
  console.log(`  Role:         ${role}`);

  db.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
