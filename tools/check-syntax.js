\
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "src");
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(root)) {
  if (!file.endsWith(".gs") && !file.endsWith(".html")) continue;

  let source = fs.readFileSync(file, "utf8");

  if (file.endsWith(".html")) {
    const blocks = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    if (!blocks.length) continue;
    source = blocks.map((match) => match[1]).join("\n");
  }

  try {
    new vm.Script(source, { filename: file });
    console.log(`OK  ${path.relative(root, file)}`);
  } catch (error) {
    failures.push({ file, error });
    console.error(`ERR ${path.relative(root, file)}\n${error.message}`);
  }
}

if (failures.length) {
  process.exit(1);
}

console.log("Syntax check passed.");
