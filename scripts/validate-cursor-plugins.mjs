#!/usr/bin/env node

/**
 * Validates Cursor plugin marketplace configuration.
 *
 * Checks:
 * - marketplace.json exists and has required fields
 * - Plugin names follow kebab-case naming convention
 * - Plugin source directories exist (resolved via pluginRoot)
 * - Plugin manifests (plugin.json) exist and are valid
 * - Referenced paths (skills, mcpServers, logo, etc.) exist
 * - SKILL.md files have valid frontmatter (name, description)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MARKETPLACE_PATH = join(ROOT, ".cursor-plugin", "marketplace.json");

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const MARKETPLACE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function readJson(filepath) {
  try {
    return JSON.parse(readFileSync(filepath, "utf8"));
  } catch (e) {
    error(`Failed to parse ${filepath}: ${e.message}`);
    return null;
  }
}

function isSafeRelativePath(p) {
  if (!p || typeof p !== "string") return false;
  if (p.startsWith("/") || p.startsWith("~")) return false;
  if (p.includes("..")) return false;
  return true;
}

function extractPaths(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "object" && value !== null) return [];
  return [];
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      fields[key] = val;
    }
  }
  return fields;
}

function validateSkillFiles(pluginDir, pluginLabel) {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) return;

  let entries;
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillPath = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) {
      warn(`${pluginLabel}: skill '${entry.name}' missing SKILL.md`);
      continue;
    }

    const content = readFileSync(skillPath, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm) {
      error(
        `${pluginLabel}: skill '${entry.name}/SKILL.md' missing YAML frontmatter`
      );
      continue;
    }
    if (!fm.name) {
      error(
        `${pluginLabel}: skill '${entry.name}/SKILL.md' frontmatter missing 'name'`
      );
    }
    if (!fm.description) {
      error(
        `${pluginLabel}: skill '${entry.name}/SKILL.md' frontmatter missing 'description'`
      );
    }
  }
}

// --- Validate marketplace.json ---

if (!existsSync(MARKETPLACE_PATH)) {
  error(`Marketplace manifest not found: ${MARKETPLACE_PATH}`);
  summarizeAndExit();
}

const marketplace = readJson(MARKETPLACE_PATH);
if (!marketplace) summarizeAndExit();

if (!marketplace.name) {
  error("marketplace.json: missing 'name' field");
} else if (!MARKETPLACE_NAME_PATTERN.test(marketplace.name)) {
  error(
    `marketplace.json: name '${marketplace.name}' must be lowercase kebab-case`
  );
}

if (!marketplace.owner?.name) {
  error("marketplace.json: missing 'owner.name' field");
}

if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
  error("marketplace.json: 'plugins' must be a non-empty array");
  summarizeAndExit();
}

const pluginRoot = marketplace.metadata?.pluginRoot || "";

// Check for duplicate plugin names
const pluginNames = new Set();
for (const plugin of marketplace.plugins) {
  if (pluginNames.has(plugin.name)) {
    error(`marketplace.json: duplicate plugin name '${plugin.name}'`);
  }
  pluginNames.add(plugin.name);
}

// --- Validate each plugin ---

for (const entry of marketplace.plugins) {
  const pluginLabel = `plugin '${entry.name || "(unnamed)"}'`;

  if (!entry.name) {
    error(`${pluginLabel}: missing 'name' field`);
    continue;
  }
  if (!NAME_PATTERN.test(entry.name)) {
    error(
      `${pluginLabel}: name must match pattern ${NAME_PATTERN} (lowercase, hyphens, periods)`
    );
  }

  if (!entry.source || typeof entry.source !== "string") {
    error(`${pluginLabel}: missing or invalid 'source' field`);
    continue;
  }

  // Resolve source using pluginRoot if present
  const sourcePath = pluginRoot
    ? join(pluginRoot, entry.source)
    : entry.source;

  if (!isSafeRelativePath(sourcePath)) {
    error(
      `${pluginLabel}: resolved source '${sourcePath}' must be a safe relative path`
    );
    continue;
  }

  const pluginDir = resolve(ROOT, sourcePath);
  if (!existsSync(pluginDir) || !statSync(pluginDir).isDirectory()) {
    error(`${pluginLabel}: source directory not found: ${sourcePath}`);
    continue;
  }

  // Validate plugin.json
  const pluginJsonPath = join(pluginDir, ".cursor-plugin", "plugin.json");
  if (!existsSync(pluginJsonPath)) {
    error(`${pluginLabel}: missing .cursor-plugin/plugin.json`);
    continue;
  }

  const pluginJson = readJson(pluginJsonPath);
  if (!pluginJson) continue;

  if (!pluginJson.name) {
    error(`${pluginLabel}: plugin.json missing 'name' field`);
  }

  // Validate logo path if present
  if (pluginJson.logo) {
    if (!isSafeRelativePath(pluginJson.logo)) {
      error(`${pluginLabel}: logo path '${pluginJson.logo}' is not safe`);
    } else {
      const logoPath = resolve(pluginDir, pluginJson.logo);
      if (!existsSync(logoPath)) {
        error(
          `${pluginLabel}: logo file not found: ${pluginJson.logo}`
        );
      }
    }
  }

  // Validate referenced paths
  const pathFields = [
    "skills",
    "commands",
    "agents",
    "hooks",
    "mcpServers",
    "lspServers",
  ];
  for (const field of pathFields) {
    if (!(field in pluginJson)) continue;
    const paths = extractPaths(pluginJson[field]);
    for (const p of paths) {
      if (!isSafeRelativePath(p)) {
        error(
          `${pluginLabel}: plugin.json '${field}' contains unsafe path '${p}'`
        );
        continue;
      }
      const resolved = resolve(pluginDir, p);
      if (!existsSync(resolved)) {
        error(
          `${pluginLabel}: plugin.json '${field}' references non-existent path '${p}'`
        );
      }
    }
  }

  // Validate SKILL.md frontmatter in skills directories
  validateSkillFiles(pluginDir, pluginLabel);
}

if (!marketplace.metadata?.description) {
  warn("marketplace.json: no description in metadata");
}

summarizeAndExit();

function summarizeAndExit() {
  console.log("\n=== Cursor Plugin Validation ===\n");

  if (warnings.length > 0) {
    for (const w of warnings) console.log(`⚠  ${w}`);
    console.log();
  }

  if (errors.length > 0) {
    for (const e of errors) console.log(`✗  ${e}`);
    console.log(`\n✗ ${errors.length} error(s) found`);
    process.exit(1);
  }

  console.log("✓ All Cursor plugin configurations are valid");
  process.exit(0);
}
