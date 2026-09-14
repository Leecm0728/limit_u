import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const h = readFileSync("docs/design-reference/LIMIT U V2.html", "utf8");
const manifest = JSON.parse(
  h.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/)[1],
);
const template = JSON.parse(
  h.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/)[1],
);
mkdirSync("public/fonts", { recursive: true });
const blocks = [...template.matchAll(/@font-face\s*{[^}]+}/g)]
  .map((m) => m[0])
  .filter((b) => b.includes("'Noto Serif KR'"));
const copied = new Set();
const css = blocks
  .map((b) =>
    b.replace(/url\("([^"]+)"\)/g, (_, id) => {
      const a = manifest[id];
      if (!a) throw new Error("Missing font " + id);
      if (!copied.has(id)) {
        let bytes = Buffer.from(a.data, "base64");
        if (a.compressed) bytes = gunzipSync(bytes);
        writeFileSync("public/fonts/" + id + ".woff2", bytes);
        copied.add(id);
      }
      return `url('/fonts/${id}.woff2')`;
    }),
  )
  .join("\n");
writeFileSync("src/app/fonts.css", css);
console.log(
  `Extracted ${copied.size} Noto Serif KR subsets; ${blocks.length} faces.`,
);
