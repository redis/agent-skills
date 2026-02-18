#!/usr/bin/env node

/**
 * Validates Claude Code plugin marketplace configuration.
 *
 * Checks:
 * - marketplace.json exists and has required fields
 * - Plugin names follow kebab-case naming convention
 * - Plugin source directories exist
 * - Plugin manifests (plugin.json) exist and are valid
 * - Referenced paths (skills, mcpServers, etc.) exist
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MARKETPLACE_PATH = join(ROOT, ".claude-plugin", "marketplace.json");

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

  if (!isSafeRelativePath(entry.source)) {
    error(
      `${pluginLabel}: source '${entry.source}' must be a safe relative path (no ../, no absolute)`
    );
    continue;
  }

  const pluginDir = resolve(ROOT, entry.source);
  if (!existsSync(pluginDir) || !statSync(pluginDir).isDirectory()) {
    error(`${pluginLabel}: source directory not found: ${entry.source}`);
    continue;
  }

  // Validate plugin.json
  const pluginJsonPath = join(pluginDir, ".claude-plugin", "plugin.json");
  if (!existsSync(pluginJsonPath)) {
    error(`${pluginLabel}: missing .claude-plugin/plugin.json`);
    continue;
  }

  const pluginJson = readJson(pluginJsonPath);
  if (!pluginJson) continue;

  if (!pluginJson.name) {
    error(`${pluginLabel}: plugin.json missing 'name' field`);
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
}

if (!marketplace.metadata?.description) {
  warn("marketplace.json: no description in metadata");
}

summarizeAndExit();

function summarizeAndExit() {
  console.log("\n=== Claude Plugin Validation ===\n");

  if (warnings.length > 0) {
    for (const w of warnings) console.log(`⚠  ${w}`);
    console.log();
  }

  if (errors.length > 0) {
    for (const e of errors) console.log(`✗  ${e}`);
    console.log(`\n✗ ${errors.length} error(s) found`);
    process.exit(1);
  }

  console.log("✓ All Claude plugin configurations are valid");
  process.exit(0);
}
