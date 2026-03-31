#!/usr/bin/env node

// Lucide Icons → SF Symbol converter
//
// Pipeline:
//   1. Download SVGs from lucide-icons/lucide repository
//   2. Apply overrides from Overrides/ directory
//   3. Compute tight bounding boxes for processed SVGs
//   4. Convert SVGs to SF Symbol format via swiftdraw
//   5. Generate .xcassets asset catalog
//   6. Generate LucideIcon+All.swift with static properties
//   7. Generate HTML gallery page
//
// Usage:
//   node Scripts/convert.mjs [--icons-dir <path>] [--output <path>] [--symbols <path>]

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";

const ROOT = resolve(import.meta.dirname, "..");

// Install svg-path-bbox for accurate path bounding box computation
try {
  createRequire(import.meta.url)("svg-path-bbox");
} catch {
  console.log("Installing svg-path-bbox...");
  execSync("npm install --no-save svg-path-bbox", { cwd: ROOT, stdio: "pipe" });
}
const { svgPathBbox } = await import("svg-path-bbox");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: opts } = parseArgs({
  options: {
    "icons-dir": { type: "string", default: "" },
    output: { type: "string", default: join(ROOT, "Sources", "LucideIcon") },
    symbols: { type: "string", default: join(ROOT, "Symbols") },
  },
  strict: false,
});

const outputDir = opts.output;
const symbolsDir = opts.symbols;

// ---------------------------------------------------------------------------
// Download Lucide icons from GitHub
// ---------------------------------------------------------------------------

function getIconsDir() {
  if (opts["icons-dir"]) return opts["icons-dir"];

  const tmpDir = join(ROOT, ".tmp-lucide");
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  console.log("Downloading lucide icons...");
  execSync(
    `git clone --depth 1 --filter=blob:none --sparse https://github.com/lucide-icons/lucide.git "${tmpDir}/repo"`,
    { stdio: "pipe" }
  );
  execSync("git sparse-checkout set icons", {
    cwd: join(tmpDir, "repo"),
    stdio: "pipe",
  });

  return join(tmpDir, "repo", "icons");
}

// ---------------------------------------------------------------------------
// SVG parsing
// ---------------------------------------------------------------------------

/** Compute combined bounding box of all path elements using svg-path-bbox. */
function computeBBox(elements) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const d = el.attrs?.d;
    if (!d) continue;
    try {
      const [x1, y1, x2, y2] = svgPathBbox(d);
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    } catch { /* skip unparseable paths */ }
  }

  // Handle circle elements
  for (const el of elements) {
    if (el.tag === "circle") {
      const cx = parseFloat(el.attrs.cx || 0);
      const cy = parseFloat(el.attrs.cy || 0);
      const r = parseFloat(el.attrs.r || 0);
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    }
  }

  // Handle line elements
  for (const el of elements) {
    if (el.tag === "line") {
      const x1 = parseFloat(el.attrs.x1 || 0);
      const y1 = parseFloat(el.attrs.y1 || 0);
      const x2 = parseFloat(el.attrs.x2 || 0);
      const y2 = parseFloat(el.attrs.y2 || 0);
      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    }
  }

  // Handle rect elements
  for (const el of elements) {
    if (el.tag === "rect") {
      const x = parseFloat(el.attrs.x || 0);
      const y = parseFloat(el.attrs.y || 0);
      const w = parseFloat(el.attrs.width || 0);
      const h = parseFloat(el.attrs.height || 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  }

  // Handle ellipse elements
  for (const el of elements) {
    if (el.tag === "ellipse") {
      const cx = parseFloat(el.attrs.cx || 0);
      const cy = parseFloat(el.attrs.cy || 0);
      const rx = parseFloat(el.attrs.rx || 0);
      const ry = parseFloat(el.attrs.ry || 0);
      minX = Math.min(minX, cx - rx);
      minY = Math.min(minY, cy - ry);
      maxX = Math.max(maxX, cx + rx);
      maxY = Math.max(maxY, cy + ry);
    }
  }

  // Handle polyline/polygon elements
  for (const el of elements) {
    if (el.tag === "polyline" || el.tag === "polygon") {
      const points = (el.attrs.points || "").trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i < points.length; i += 2) {
        if (!isNaN(points[i]) && !isNaN(points[i + 1])) {
          minX = Math.min(minX, points[i]);
          minY = Math.min(minY, points[i + 1]);
          maxX = Math.max(maxX, points[i]);
          maxY = Math.max(maxY, points[i + 1]);
        }
      }
    }
  }

  return isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

/** Build processed (tight viewBox) and original (24x24) SVG pair from elements. */
function buildSVGPair(elements) {
  if (elements.length === 0) return null;

  const STROKE_WIDTH = 2;
  const bbox = computeBBox(elements);
  let vbW = 24, vbH = 24;
  let vb = "0 0 24 24";
  if (bbox) {
    const pad = STROKE_WIDTH / 2;
    const x = bbox.minX - pad;
    const y = bbox.minY - pad;
    vbW = bbox.maxX - bbox.minX + STROKE_WIDTH;
    vbH = bbox.maxY - bbox.minY + STROKE_WIDTH;
    vb = `${x} ${y} ${vbW} ${vbH}`;
  }

  let children = "";
  for (const el of elements) {
    const attrStr = Object.entries(el.attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    children += `  <${el.tag} ${attrStr}/>\n`;
  }

  const svgAttrs = `fill="none" stroke="black" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"`;
  const processed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${vbW}" height="${vbH}" ${svgAttrs}>\n${children}</svg>\n`;
  const original = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" ${svgAttrs}>\n${children}</svg>\n`;
  return { processed, original };
}

/** Parse a raw SVG file into elements and build the pair. */
function parseSVGFile(svgContent) {
  const elements = [];
  const tagPattern = /<(path|circle|ellipse|rect|line|polyline|polygon)\s([^>]*?)\/>/g;
  let match;
  while ((match = tagPattern.exec(svgContent)) !== null) {
    const tag = match[1];
    const attrs = {};
    for (const am of match[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
      const key = am[1];
      const value = am[2];
      // Skip currentColor — root attributes handle stroke color
      if (value === "currentColor") continue;
      // Skip class attributes
      if (key === "class") continue;
      attrs[key] = value;
    }
    elements.push({ tag, attrs });
  }
  return buildSVGPair(elements);
}

// ---------------------------------------------------------------------------
// Naming conventions
// ---------------------------------------------------------------------------

function toSwiftName(kebab) {
  return kebab.replace(/[-.]/g, "_");
}

const SWIFT_KEYWORDS = new Set([
  "as", "break", "case", "catch", "class", "continue", "default", "defer",
  "deinit", "do", "else", "enum", "extension", "fallthrough", "false",
  "fileprivate", "for", "func", "guard", "if", "import", "in", "init",
  "inout", "internal", "is", "let", "nil", "open", "operator", "override",
  "private", "precedencegroup", "protocol", "public", "repeat", "rethrows",
  "return", "self", "Self", "static", "struct", "subscript", "super",
  "switch", "throw", "throws", "true", "try", "typealias", "var", "where",
  "while",
]);

function escapeIfKeyword(name) {
  return SWIFT_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

// ---------------------------------------------------------------------------
// SVG conversion via swiftdraw
// ---------------------------------------------------------------------------

let swiftdrawBin = "swiftdraw";

function convertSVG(inputSvg, outputSvg) {
  const args = [inputSvg, "--format", "sfsymbol", "--insets", "0,0,0,0", "--size", "medium", "--output", outputSvg];
  try {
    execFileSync(swiftdrawBin, args, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HTML gallery page generation
// ---------------------------------------------------------------------------

function generateHTMLPage(iconNames, outPath) {
  const json = JSON.stringify(iconNames);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lucide Icons</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa;color:#111}
.header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e5e5;padding:16px 24px;z-index:10}
.header h1{font-size:20px;font-weight:600;margin-bottom:12px}
.toolbar{display:flex;align-items:center;gap:12px}
.toolbar input{flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none}
.toolbar input:focus{border-color:#f56565;box-shadow:0 0 0 3px rgba(245,101,101,.1)}
.count{font-size:13px;color:#6b7280;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;padding:24px}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:14px 8px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.card:hover{border-color:#f56565;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.card img{width:28px;height:28px}
.card .name{font-size:10px;color:#6b7280;text-align:center;word-break:break-all;line-height:1.3}
.actions{display:none;gap:4px;margin-top:2px}
.card:hover .actions{display:flex}
.actions a{font-size:10px;padding:2px 8px;border-radius:4px;text-decoration:none;color:#f56565;background:#fff5f5;font-weight:500}
.actions a:hover{background:#f56565;color:#fff}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
</style>
</head>
<body>
<div class="header">
  <h1>Lucide Icons</h1>
  <div class="toolbar">
    <input type="text" id="q" placeholder="Search icons\\u2026" autofocus>
    <span class="count" id="count"></span>
  </div>
</div>
<div class="grid" id="grid"></div>
<div class="toast" id="toast"></div>
<script>
const icons=${json};
const grid=document.getElementById("grid");
const q=document.getElementById("q");
const countEl=document.getElementById("count");
const toastEl=document.getElementById("toast");
let tid;
function render(f){
  const list=f?icons.filter(n=>n.includes(f)):icons;
  countEl.textContent=list.length+" / "+icons.length;
  grid.innerHTML=list.map(n=>'<div class="card" onclick="copy(\\''+n+'\\')">'+
    '<img src="SVGs/processed/'+n+'.svg" loading="lazy" alt="'+n+'">'+
    '<div class="name">'+n+'</div>'+
    '<div class="actions">'+
    '<a href="SVGs/original/'+n+'.svg" download="'+n+'.svg" onclick="event.stopPropagation()">SVG</a>'+
    '<a href="SVGs/processed/'+n+'.svg" download="'+n+'.trimmed.svg" onclick="event.stopPropagation()">Trimmed</a>'+
    '<a href="Symbols/'+n+'.svg" download="'+n+'.sfsymbol.svg" onclick="event.stopPropagation()">SF\\u00a0Symbol</a>'+
    '</div></div>').join("");
}
function copy(n){
  navigator.clipboard.writeText(n);
  toastEl.textContent="Copied \\u201c"+n+"\\u201d";
  toastEl.classList.add("show");
  clearTimeout(tid);
  tid=setTimeout(()=>toastEl.classList.remove("show"),1500);
}
q.addEventListener("input",e=>render(e.target.value.toLowerCase()));
render("");
</script>
</body>
</html>
`;
  writeFileSync(outPath, html);
}

// ---------------------------------------------------------------------------
// Asset catalog generation
// ---------------------------------------------------------------------------

function createSymbolset(xcassetsDir, symbolName, svgSource) {
  const setDir = join(xcassetsDir, `${symbolName}.symbolset`);
  mkdirSync(setDir, { recursive: true });
  copyFileSync(svgSource, join(setDir, `${symbolName}.svg`));
  writeFileSync(
    join(setDir, "Contents.json"),
    JSON.stringify(
      {
        info: { author: "xcode", version: 1 },
        symbols: [{ filename: `${symbolName}.svg`, idiom: "universal" }],
      },
      null,
      2
    )
  );
}

// ---------------------------------------------------------------------------
// Swift codegen
// ---------------------------------------------------------------------------

function generateSwiftProperty(identifier, swiftName) {
  return [
    `\t/// \`${identifier}\``,
    `\tstatic public let ${escapeIfKeyword(swiftName)} = LucideIcon(identifier: "${identifier}")`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const iconsDir = getIconsDir();

if (!existsSync(iconsDir)) {
  console.error(`Error: icons directory not found at ${iconsDir}`);
  process.exit(1);
}

// Resolve swiftdraw full path
try {
  swiftdrawBin = execSync("which swiftdraw", { encoding: "utf-8" }).trim();
} catch {
  console.error("Error: swiftdraw not found. Install with: brew install swiftdraw");
  process.exit(1);
}

// Step 1: Extract SVGs from Lucide repository
console.log("Reading Lucide SVG icons...");
const extractedDir = join(ROOT, ".tmp-extracted-svgs");
rmSync(extractedDir, { recursive: true, force: true });
mkdirSync(extractedDir, { recursive: true });

const svgFiles = readdirSync(iconsDir).filter((f) => f.endsWith(".svg"));

const icons = [];
for (const file of svgFiles) {
  const kebabName = basename(file, ".svg");
  const content = readFileSync(join(iconsDir, file), "utf-8");
  const result = parseSVGFile(content);
  if (!result) {
    console.log(`  Skipped (no paths): ${kebabName}`);
    continue;
  }

  const svgPath = join(extractedDir, `${kebabName}.svg`);
  writeFileSync(svgPath, result.processed);
  icons.push({ kebabName, svgPath, originalSvg: result.original });
}

console.log(`  Read ${icons.length} SVGs`);

// Step 1.5: Apply overrides from Overrides/ directory
const overridesDir = join(ROOT, "Overrides");
if (existsSync(overridesDir)) {
  const overrideFiles = readdirSync(overridesDir).filter((f) => f.endsWith(".svg"));
  let applied = 0;
  for (const file of overrideFiles) {
    const kebabName = basename(file, ".svg");
    const svgContent = readFileSync(join(overridesDir, file), "utf-8");
    const result = parseSVGFile(svgContent);
    if (!result) {
      console.log(`  Override skipped (no paths): ${kebabName}`);
      continue;
    }

    const svgPath = join(extractedDir, `${kebabName}.svg`);
    writeFileSync(svgPath, result.processed);

    const idx = icons.findIndex((i) => i.kebabName === kebabName);
    if (idx >= 0) {
      icons[idx].svgPath = svgPath;
      icons[idx].originalSvg = result.original;
    } else {
      icons.push({ kebabName, svgPath, originalSvg: result.original });
    }
    applied++;
  }
  if (applied > 0) console.log(`  Applied ${applied} override(s)`);
}

// Step 2: Prepare output directories
const xcassetsDir = join(outputDir, "Resources", "LucideIcon.xcassets");
const swiftOutPath = join(outputDir, "LucideIcon+All.swift");

rmSync(symbolsDir, { recursive: true, force: true });
rmSync(xcassetsDir, { recursive: true, force: true });
mkdirSync(symbolsDir, { recursive: true });
mkdirSync(xcassetsDir, { recursive: true });

writeFileSync(
  join(xcassetsDir, "Contents.json"),
  JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)
);

// Step 3: Convert SVGs via SwiftDraw
console.log("Converting SVGs to SF Symbols...");
let total = 0;
let failed = 0;
const convertedNames = [];

for (const icon of icons) {
  const outFile = join(symbolsDir, `${icon.kebabName}.svg`);

  if (convertSVG(icon.svgPath, outFile)) {
    createSymbolset(xcassetsDir, icon.kebabName, outFile);
    convertedNames.push(icon.kebabName);
    total++;
  } else {
    console.log(`  Failed: ${icon.kebabName}`);
    failed++;
  }
}

// Step 4: Generate Swift source
console.log("Generating Swift source...");

convertedNames.sort();

const properties = convertedNames.map((name) =>
  generateSwiftProperty(name, toSwiftName(name))
);

const swift = `//
//  LucideIcon+All.swift
//
//  Automatically generated by LucideIcon.
//  Do not edit directly!
//  swift-format-ignore-file

import Foundation

extension LucideIcon {
${properties.join("\n\n")}
}
`;

writeFileSync(swiftOutPath, swift);

// Step 5: Save extracted SVGs for web preview / download
console.log("Saving extracted SVGs...");
const svgsDir = join(ROOT, "SVGs");
rmSync(svgsDir, { recursive: true, force: true });
const svgsOriginalDir = join(svgsDir, "original");
const svgsProcessedDir = join(svgsDir, "processed");
mkdirSync(svgsOriginalDir, { recursive: true });
mkdirSync(svgsProcessedDir, { recursive: true });

for (const icon of icons) {
  if (convertedNames.includes(icon.kebabName)) {
    copyFileSync(icon.svgPath, join(svgsProcessedDir, `${icon.kebabName}.svg`));
    writeFileSync(join(svgsOriginalDir, `${icon.kebabName}.svg`), icon.originalSvg);
  }
}

// Step 6: Generate HTML gallery page
console.log("Generating HTML gallery...");
const htmlPath = join(ROOT, "index.html");
generateHTMLPage(convertedNames, htmlPath);

// Cleanup
rmSync(extractedDir, { recursive: true, force: true });
rmSync(join(ROOT, ".tmp-lucide"), { recursive: true, force: true });

// Save Lucide version info
try {
  const versionFile = join(ROOT, ".tmp-lucide", "repo", "package.json");
  if (existsSync(versionFile)) {
    const pkg = JSON.parse(readFileSync(versionFile, "utf-8"));
    writeFileSync(join(ROOT, ".lucide-version"), pkg.version || "unknown");
  }
} catch { /* version tracking is optional */ }

console.log();
console.log(`Done! Converted ${total} symbols (${failed} failed)`);
console.log(`  Symbols: ${symbolsDir}/`);
console.log(`  SVGs:    ${svgsDir}/`);
console.log(`  Assets:  ${xcassetsDir}/`);
console.log(`  Swift:   ${swiftOutPath}`);
console.log(`  HTML:    ${htmlPath}`);
