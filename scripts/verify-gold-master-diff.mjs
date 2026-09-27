import { execFileSync } from "node:child_process";

const base = process.env.GOLD_MASTER_BASE
  || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD~1");

let diff = "";
try {
  diff = execFileSync("git", ["diff", "--unified=0", `${base}...HEAD`, "--", "src"], { encoding: "utf8" });
} catch (error) {
  console.error("[gold-master-guard] unable to compute diff:", error.message);
  process.exit(1);
}

const ignored = [
  "src/styles/gold-master.css",
  "src/design-system/tokens.js",
  "src/design-system/index.jsx",
];

const violations = [];
let file = "";

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    file = line.slice(6);
    continue;
  }

  if (!line.startsWith("+") || line.startsWith("+++")) continue;
  if (!file || ignored.includes(file)) continue;

  const added = line.slice(1);
  if (added.includes("gold-master-allow")) continue;

  if (/#[0-9a-fA-F]{3,8}\b/.test(added)) {
    violations.push(`${file}: new hard-coded color; use a --3b-* token`);
  }

  const radiusMatch = added.match(/\bborder-radius\s*:\s*([^;}]+)/i);
  if (radiusMatch && !radiusMatch[1].trim().startsWith("var(")) {
    violations.push(`${file}: new literal border-radius; use a Gold Master radius token`);
  }

  const shadowMatch = added.match(/\bbox-shadow\s*:\s*([^;}]+)/i);
  if (shadowMatch && !shadowMatch[1].trim().startsWith("var(")) {
    violations.push(`${file}: new literal box-shadow; use a Gold Master material/shadow token`);
  }

  if (/\.jsx$/.test(file) && /<button\b/.test(added)) {
    violations.push(`${file}: new raw <button>; use the shared Gold Master Button`);
  }

  if (/\.jsx$/.test(file) && /<video\b/.test(added)) {
    violations.push(`${file}: new raw <video>; use the shared Gold Master VideoPlayer`);
  }
}

if (violations.length) {
  console.error("[gold-master-guard] visual drift blocked:");
  for (const item of [...new Set(violations)]) console.error(`- ${item}`);
  console.error("Add // gold-master-allow only for a reviewed, documented exception.");
  process.exit(1);
}

console.log("[gold-master-guard] no new visual drift detected.");
