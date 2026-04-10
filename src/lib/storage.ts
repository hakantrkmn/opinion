import { join } from "path";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), "storage", "uploads");
