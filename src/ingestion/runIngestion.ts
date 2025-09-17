import dotenv from "dotenv";
dotenv.config();

import { IngestionService } from "../services/ingestion.service";

async function main() {
  try {
    const s = new IngestionService();
    await s.run();
    process.exit(0);
  } catch (err) {
    console.error("Ingestion failed:", (err as Error).message);
    process.exit(1);
  }
}

main();
