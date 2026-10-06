// POSTs mock/sessions.json to the API, or deletes what a previous run created.
//
//   node mock/seed.mjs                      # add all mock sessions
//   node mock/seed.mjs --clean              # delete the sessions added by the last run
//   node mock/seed.mjs --api http://localhost:5086
//
// Created IDs are saved in mock/.seeded-ids.json so --clean only removes mock data.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const apiIndex = args.indexOf("--api");
const api = (apiIndex >= 0 ? args[apiIndex + 1] : "http://localhost:5086").replace(/\/$/, "");
const idsFile = resolve(here, ".seeded-ids.json");

if (args.includes("--clean")) {
  if (!existsSync(idsFile)) {
    console.log("Nothing to clean: mock/.seeded-ids.json not found.");
    process.exit(0);
  }
  const ids = JSON.parse(readFileSync(idsFile, "utf8"));
  let deleted = 0;
  for (const id of ids) {
    const res = await fetch(`${api}/api/v1/sessions/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) deleted++;
    else console.error(`DELETE ${id} failed: ${res.status}`);
  }
  rmSync(idsFile);
  console.log(`Deleted ${deleted} of ${ids.length} mock sessions.`);
  process.exit(0);
}

const sessions = JSON.parse(readFileSync(resolve(here, "sessions.json"), "utf8"));
const previous = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, "utf8")) : [];
const created = [];

for (const [i, body] of sessions.entries()) {
  const res = await fetch(`${api}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`#${i + 1} ${body.initialUrl} → ${res.status} ${await res.text()}`);
    continue;
  }
  const { id } = await res.json();
  created.push(id);
}

writeFileSync(idsFile, JSON.stringify([...previous, ...created], null, 2) + "\n");
console.log(`Created ${created.length} of ${sessions.length} sessions on ${api}. Remove them with: node mock/seed.mjs --clean`);
