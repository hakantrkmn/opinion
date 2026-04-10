import { NextRequest, NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import { join, normalize, resolve, extname, sep } from "path";
import { UPLOAD_DIR } from "@/lib/storage";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const relativePath = normalize(segments.join("/"));
  const baseDir = resolve(UPLOAD_DIR);
  const absolutePath = resolve(join(baseDir, relativePath));

  if (!absolutePath.startsWith(baseDir + sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const buffer = await readFile(absolutePath);
    const ext = extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": fileStat.mtime.toUTCString(),
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
