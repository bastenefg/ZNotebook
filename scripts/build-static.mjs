import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const publicDir = path.join(dist, "public");

const files = [
  ".nojekyll",
  "app.js",
  "config.js",
  "index.html",
  "privacy.html",
  "styles.css",
];

await rm(dist, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await mkdir(path.join(dist, "server"), { recursive: true });
await mkdir(path.join(dist, ".openai"), { recursive: true });

await Promise.all(files.map((file) => copyFile(path.join(root, file), path.join(publicDir, file))));
await copyFile(path.join(root, ".openai", "hosting.json"), path.join(dist, ".openai", "hosting.json"));

await writeFile(
  path.join(dist, "server", "index.js"),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
`,
);
