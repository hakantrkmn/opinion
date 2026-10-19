import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname } from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { resolveUploadPath } from "@/server/uploads";

export const runtime = "nodejs";

// Raster formats only. SVG is intentionally absent: it can carry script.
// New uploads are always .webp; the others cover legacy files.
const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-site",
};

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments?.length) return notFound();

  const absolutePath = resolveUploadPath(`/uploads/${segments.join("/")}`);
  if (!absolutePath) return notFound();

  const contentType = MIME_TYPES[extname(absolutePath).toLowerCase()];
  if (!contentType) return notFound();

  let fileStat;
  try {
    fileStat = await stat(absolutePath);
  } catch {
    return notFound();
  }
  if (!fileStat.isFile()) return notFound();

  // File names are unique and never rewritten, so size+mtime is a stable tag.
  const etag = `"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Last-Modified": fileStat.mtime.toUTCString(),
  };

  const ifNoneMatch = request.headers.get("if-none-match");
  if (
    ifNoneMatch &&
    ifNoneMatch.split(",").some((t) => t.trim().replace(/^W\//, "") === etag)
  ) {
    return new NextResponse(null, { status: 304, headers });
  }

  const stream = Readable.toWeb(
    createReadStream(absolutePath)
  ) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: 200,
    headers: { ...headers, "Content-Length": fileStat.size.toString() },
  });
}
