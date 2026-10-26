import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  console.log("Connecting to PostgreSQL to verify pg_trgm extension...");
  const pool = new Pool({ connectionString });

  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    console.log("✔ Extension pg_trgm enabled successfully.");

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_institutions_normalized_name_trgm ON "Institution" USING gin ("normalized_name" gin_trgm_ops);`
    );
    console.log("✔ GIN Trigram index created on Institution(normalized_name).");
  } catch (err) {
    console.error("Error setting up extension:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
