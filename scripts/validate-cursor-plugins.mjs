#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath, context) {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      addError(`${context} exists but is not a directory: ${targetPath}`);
      return false;
    }
    return true;
  } catch {
    addError(`${context} directory is missing: ${targetPath}`);
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(
      `${context} contains invalid JSON (${filePath}): ${error.message}`,
    );
    return null;
  }
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (path.isAbsolute(value) || /^[a-zA-Z]:/.test(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }
  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }
  return [];
}

function validateRequiredString(value, context) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(`${context} is required and must be a non-empty string.`);
    return false;
  }
  return true;
}

async function validateManifestPath(pluginDir, pluginName, fieldName, value) {
  if (!isSafeRelativePath(value)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid relative path "${value}".`,
    );
    return;
  }
  const resolved = path.resolve(pluginDir, value);
  if (!(await pathExists(resolved))) {
    addError(
      `${pluginName}: field "${fieldName}" references missing path "${value}".`,
    );
  }
}

async function validatePluginManifest(manifestPath, pluginDir, context) {
  const pluginManifest = await readJsonFile(manifestPath, context);
  if (!pluginManifest) {
    return;
  }

  const label = pluginManifest.name || context;

  if (
    typeof pluginManifest.name !== "string" ||
    !pluginNamePattern.test(pluginManifest.name)
  ) {
    addError(
      `${label}: "name" must be lowercase and use only alphanumerics, hyphens, and periods.`,
    );
  }

  validateRequiredString(pluginManifest.version, `${label}: version`);
  validateRequiredString(pluginManifest.description, `${label}: description`);
  validateRequiredString(pluginManifest.license, `${label}: license`);

  if (
    !pluginManifest.author ||
    typeof pluginManifest.author !== "object" ||
    typeof pluginManifest.author.name !== "string" ||
    pluginManifest.author.name.length === 0
  ) {
    addError(`${label}: author.name is required.`);
  }
  if (
    !Array.isArray(pluginManifest.keywords) ||
    pluginManifest.keywords.length === 0 ||
    pluginManifest.keywords.some(
      (keyword) => typeof keyword !== "string" || keyword.trim().length === 0,
    )
  ) {
    addError(`${label}: keywords must be a non-empty string array.`);
  }

  for (const field of [
    "logo",
    "rules",
    "skills",
    "agents",
    "commands",
    "hooks",
    "mcpServers",
  ]) {
    for (const value of extractPathValues(pluginManifest[field])) {
      await validateManifestPath(pluginDir, label, field, value);
    }
  }
}

async function validateMarketplace(marketplacePath) {
  const marketplace = await readJsonFile(marketplacePath, "Cursor marketplace manifest");
  if (!marketplace) {
    return;
  }

  validateRequiredString(marketplace.name, "marketplace: name");

  if (
    !marketplace.owner ||
    typeof marketplace.owner !== "object" ||
    typeof marketplace.owner.name !== "string" ||
    marketplace.owner.name.length === 0
  ) {
    addError("marketplace: owner.name is required.");
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError("marketplace: plugins must be a non-empty array.");
    return;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot || "";

  if (pluginRoot && !isSafeRelativePath(pluginRoot)) {
    addError(`marketplace: metadata.pluginRoot has invalid path "${pluginRoot}".`);
    return;
  }

  for (const entry of marketplace.plugins) {
    if (
      typeof entry.name !== "string" ||
      !pluginNamePattern.test(entry.name)
    ) {
      addError(
        `marketplace plugin entry: "name" must be lowercase kebab-case.`,
      );
      continue;
    }

    const source = typeof entry.source === "string"
      ? entry.source
      : entry.source?.path;

    if (!source) {
      addError(`${entry.name}: marketplace entry requires a "source" path.`);
      continue;
    }

    if (!isSafeRelativePath(source)) {
      addError(`${entry.name}: source has invalid path "${source}".`);
      continue;
    }

    const pluginDir = path.resolve(repoRoot, pluginRoot, source);
    if (!(await pathExists(pluginDir))) {
      addError(`${entry.name}: resolved plugin directory does not exist: ${pluginDir}`);
      continue;
    }

    const perPluginManifest = path.join(pluginDir, ".cursor-plugin", "plugin.json");
    if (!(await pathExists(perPluginManifest))) {
      addError(`${entry.name}: per-plugin manifest is missing: ${perPluginManifest}`);
      continue;
    }
    await validatePluginManifest(perPluginManifest, pluginDir, `${entry.name} plugin.json`);
  }
}

async function main() {
  await ensureDirectory(path.join(repoRoot, ".cursor-plugin"), ".cursor-plugin");

  const marketplacePath = path.join(repoRoot, ".cursor-plugin", "marketplace.json");
  const rootManifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");

  if (await pathExists(marketplacePath)) {
    await validateMarketplace(marketplacePath);
  } else if (await pathExists(rootManifestPath)) {
    await validatePluginManifest(rootManifestPath, repoRoot, "Cursor plugin manifest");
  } else {
    addError("No .cursor-plugin/marketplace.json or .cursor-plugin/plugin.json found.");
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log("Validation passed.");
}

await main();
