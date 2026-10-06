import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

mkdirSync(dist, { recursive: true });

cpSync(resolve(root, "static"), dist, { recursive: true });

const env = resolve(root, ".env");
if (existsSync(env)) {
  cpSync(env, resolve(dist, ".env"));
} else {
  console.warn("Missing .env - create an .env file at the root (see .env.example) before running the extension.");
}

console.log("Static assets copied to dist/");
