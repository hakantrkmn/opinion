import "server-only";
import { join, resolve } from "path";

/** Root directory for user uploads (mounted as a volume in production). */
export const UPLOAD_DIR = resolve(
  process.env.UPLOAD_DIR || join(process.cwd(), "storage", "uploads")
);
