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

async function validateReferencedPath(
  pluginDir,
  fieldName,
  pathValue,
  pluginName,
) {
  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid relative path "${pathValue}".`,
    );
    return;
  }
  const resolved = path.resolve(pluginDir, pathValue);
  if (!(await pathExists(resolved))) {
    addError(
      `${pluginName}: field "${fieldName}" references missing path "${pathValue}".`,
    );
  }
}

async function main() {
  const marketplacePath = path.join(
    repoRoot,
    ".claude-plugin",
    "marketplace.json",
  );
  const marketplace = await readJsonFile(
    marketplacePath,
    "Claude marketplace manifest",
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
      addError(
        `Duplicate plugin name in marketplace manifest: "${entry.name}"`,
      );
    }
    seenNames.add(entry.name);

    if (typeof entry.source !== "string" || entry.source.length === 0) {
      addError(`${label}.source must be a non-empty relative path string.`);
      continue;
    }
    if (!isSafeRelativePath(entry.source)) {
      addError(
        `${label}.source is not a safe relative path: "${entry.source}"`,
      );
      continue;
    }

    const pluginDir = path.join(repoRoot, entry.source);
    if (!(await ensureDirectory(pluginDir, `${label}.source`))) {
      continue;
    }

    const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
    const pluginManifest = await readJsonFile(
      manifestPath,
      `${entry.name} claude plugin manifest`,
    );
    if (!pluginManifest) {
      continue;
    }

    const fields = [
      "skills",
      "commands",
      "agents",
      "hooks",
      "mcpServers",
      "lspServers",
    ];
    for (const field of fields) {
      for (const value of extractPathValues(pluginManifest[field])) {
        await validateReferencedPath(pluginDir, field, value, entry.name);
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
