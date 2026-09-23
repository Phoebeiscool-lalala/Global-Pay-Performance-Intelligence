import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  await cp(resolve(root, file), resolve(output, file));
}

for (const directory of ["data", "engines"]) {
  await cp(resolve(root, directory), resolve(output, directory), { recursive: true });
}

await mkdir(resolve(output, ".openai"), { recursive: true });
await cp(
  resolve(root, ".openai", "hosting.json"),
  resolve(output, ".openai", "hosting.json"),
);

console.log("Static site prepared in dist/");
