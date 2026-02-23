#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

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

function resolveMarketplaceSource(source, pluginRoot) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  if (!pluginRoot) {
    return source;
  }
  const normalizedRoot = pluginRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedSource = source.replace(/\\/g, "/");
  if (
    normalizedSource === normalizedRoot ||
    normalizedSource.startsWith(`${normalizedRoot}/`)
  ) {
    return normalizedSource;
  }
  return `${normalizedRoot}/${normalizedSource}`;
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

async function main() {
  const marketplacePath = path.join(
    repoRoot,
    ".cursor-plugin",
    "marketplace.json",
  );
  const marketplace = await readJsonFile(
    marketplacePath,
    "Cursor marketplace manifest",
  );
  if (!marketplace) {
    summarizeAndExit();
    return;
  }

  if (
    typeof marketplace.name !== "string" ||
    !marketplaceNamePattern.test(marketplace.name)
  ) {
    addError(
      'Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.',
    );
  }
  if (
    !marketplace.owner ||
    typeof marketplace.owner.name !== "string" ||
    marketplace.owner.name.length === 0
  ) {
    addError('Marketplace "owner.name" is required.');
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarizeAndExit();
    return;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot;
  if (pluginRoot !== undefined) {
    if (typeof pluginRoot !== "string" || !isSafeRelativePath(pluginRoot)) {
      addError(
        'Marketplace "metadata.pluginRoot" must be a safe relative path.',
      );
    } else {
      await ensureDirectory(
        path.join(repoRoot, pluginRoot),
        'Marketplace "metadata.pluginRoot"',
      );
    }
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }
    if (typeof entry.name !== "string" || !pluginNamePattern.test(entry.name)) {
      addError(
        `${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`,
      );
      continue;
    }
    if (seenNames.has(entry.name)) {
      addError(`Duplicate plugin name in marketplace manifest: "${entry.name}"`);
    }
    seenNames.add(entry.name);

    validateRequiredString(entry.description, `${label}.description`);

    const sourcePath = resolveMarketplaceSource(entry.source, pluginRoot ?? "");
    if (!sourcePath) {
      addError(`${label}.source must be a non-empty string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(`${label}.source is not a safe relative path: "${sourcePath}"`);
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    if (!(await ensureDirectory(pluginDir, `${label}.source`))) {
      continue;
    }

    const manifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
    const pluginManifest = await readJsonFile(
      manifestPath,
      `${entry.name} cursor plugin manifest`,
    );
    if (!pluginManifest) {
      continue;
    }

    if (
      typeof pluginManifest.name !== "string" ||
      !pluginNamePattern.test(pluginManifest.name)
    ) {
      addError(
        `${entry.name}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`,
      );
    } else if (pluginManifest.name !== entry.name) {
      addError(
        `${entry.name}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`,
      );
    }

    validateRequiredString(pluginManifest.displayName, `${entry.name}: displayName`);
    validateRequiredString(pluginManifest.version, `${entry.name}: version`);
    validateRequiredString(pluginManifest.description, `${entry.name}: description`);
    validateRequiredString(pluginManifest.license, `${entry.name}: license`);

    if (
      !pluginManifest.author ||
      typeof pluginManifest.author !== "object" ||
      typeof pluginManifest.author.name !== "string" ||
      pluginManifest.author.name.length === 0
    ) {
      addError(`${entry.name}: author.name is required in plugin.json.`);
    }
    if (
      !Array.isArray(pluginManifest.keywords) ||
      pluginManifest.keywords.length === 0 ||
      pluginManifest.keywords.some(
        (keyword) => typeof keyword !== "string" || keyword.trim().length === 0,
      )
    ) {
      addError(`${entry.name}: keywords must be a non-empty string array.`);
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
        await validateManifestPath(pluginDir, entry.name, field, value);
      }
    }
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
