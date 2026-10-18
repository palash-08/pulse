import pg from "pg";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

async function resetDb() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to reset database in production environment!");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("⚠️ Resetting database (dropping schema public)...");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("DROP SCHEMA public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query("GRANT ALL ON SCHEMA public TO public;");
    console.log("✅ Schema public reset.");
  } finally {
    await client.end();
  }

  console.log("⚡ Re-running migrations...");
  execSync("npm run db:migrate", { stdio: "inherit" });
  console.log("🎉 Database successfully reset and migrated!");
}

resetDb().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
