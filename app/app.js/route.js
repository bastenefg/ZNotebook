import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const content = await readFile(path.join(process.cwd(), "app.js"), "utf8");
  return new Response(content, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
