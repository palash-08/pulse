import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function dumpSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), "../docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "pulse_submission.sql");
  console.log(`📦 Generating submission SQL dump to ${outputPath}...`);

  try {
    // Attempt pg_dump if available on system
    execSync(`pg_dump "${databaseUrl}" --inserts --no-owner --clean --if-exists -f "${outputPath}"`, {
      stdio: "inherit",
    });
    console.log(`🎉 SQL dump generated successfully at: ${outputPath}`);
  } catch (err: any) {
    console.warn("⚠️ pg_dump command failed or not found on PATH. Writing migration concatenation fallback...");
    // Fallback: concatenate migrations and schema
    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const sqlFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();

    let combinedSql = `-- Pulse Database Submission SQL Dump\n-- Generated on ${new Date().toISOString()}\n\n`;
    for (const file of sqlFiles) {
      combinedSql += `-- ==========================================\n-- File: ${file}\n-- ==========================================\n`;
      combinedSql += fs.readFileSync(path.join(drizzleDir, file), "utf-8") + "\n\n";
    }

    fs.writeFileSync(outputPath, combinedSql, "utf-8");
    console.log(`✅ Concatenated SQL dump created at: ${outputPath}`);
  }
}

dumpSql();
