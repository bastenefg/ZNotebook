import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

const files = [
  ".nojekyll",
  "app.js",
  "config.js",
  "index.html",
  "privacy.html",
  "styles.css",
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all(files.map((file) => copyFile(path.join(root, file), path.join(dist, file))));
