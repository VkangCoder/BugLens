// POSTs mock/sessions.json to the API, or deletes what a previous run created.
//
//   node mock/seed.mjs                                  # add all mock sessions (X-Api-Key from .env API_KEY)
//   node mock/seed.mjs --key bl_...                     # same, with an explicit project ingest key
//   node mock/seed.mjs --clean --user whey --password …  # delete the sessions added by earlier runs (Admin only)
//   node mock/seed.mjs --api http://localhost:5086
//
// Sessions go to the project that owns the key. Created IDs are saved in
// mock/.seeded-ids.json so --clean only removes mock data.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// Same .env the extension uses (repo root)
function readEnv() {
  const file = resolve(here, "..", ".env");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value]),
  );
}

const env = readEnv();
const api = (arg("--api") ?? env.API_BASE_URL ?? "http://localhost:5086").replace(/\/$/, "");
const idsFile = resolve(here, ".seeded-ids.json");

if (args.includes("--clean")) {
  if (!existsSync(idsFile)) {
    console.log("Nothing to clean: mock/.seeded-ids.json not found.");
    process.exit(0);
  }

  // Deleting sessions needs an Admin JWT
  const user = arg("--user");
  const password = arg("--password");
  if (!user || !password) {
    console.error("--clean needs an Admin account: --user <name> --password <password>");
    process.exit(1);
  }
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: user, password }),
  });
  if (!login.ok) {
    console.error(`Sign in failed (${login.status}).`);
    process.exit(1);
  }
  const { token } = await login.json();

  const ids = JSON.parse(readFileSync(idsFile, "utf8"));
  let deleted = 0;
  for (const id of ids) {
    const res = await fetch(`${api}/api/v1/sessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 404) deleted++;
    else console.error(`DELETE ${id} failed: ${res.status}`);
  }
  rmSync(idsFile);
  console.log(`Deleted ${deleted} of ${ids.length} mock sessions.`);
  process.exit(0);
}

const key = arg("--key") ?? env.API_KEY;
if (!key) {
  console.error("Missing ingest key: set API_KEY in .env (repo root) or pass --key bl_...");
  process.exit(1);
}

const sessions = JSON.parse(readFileSync(resolve(here, "sessions.json"), "utf8"));
const previous = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, "utf8")) : [];
const created = [];

for (const [i, body] of sessions.entries()) {
  const res = await fetch(`${api}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": key },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    console.error("API key is invalid or revoked (401). Stopping.");
    break;
  }
  if (!res.ok) {
    console.error(`#${i + 1} ${body.initialUrl} → ${res.status} ${await res.text()}`);
    continue;
  }
  const { id } = await res.json();
  created.push(id);
}

writeFileSync(idsFile, JSON.stringify([...previous, ...created], null, 2) + "\n");
console.log(
  `Created ${created.length} of ${sessions.length} sessions on ${api}. Remove them with: node mock/seed.mjs --clean --user <admin> --password <password>`,
);
