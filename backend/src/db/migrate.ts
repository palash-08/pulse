import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log("🚀 Starting database migrations...");

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__pulse_migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const drizzleDir = path.resolve(__dirname, "../../drizzle");
    if (!fs.existsSync(drizzleDir)) {
      console.error(`❌ Migration directory not found: ${drizzleDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT id FROM __pulse_migrations WHERE name = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`⚡ Applying migration: ${file}...`);
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(sqlContent);
        await client.query(
          "INSERT INTO __pulse_migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ Successfully applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Error applying ${file}:`, err);
        throw err;
      }
    }

    console.log("🎉 All migrations applied successfully!");
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
