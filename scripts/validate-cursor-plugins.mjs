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

async function main() {
  const manifestPath = path.join(
    repoRoot,
    ".cursor-plugin",
    "plugin.json",
  );
  const pluginManifest = await readJsonFile(
    manifestPath,
    "Cursor plugin manifest",
  );
  if (!pluginManifest) {
    summarizeAndExit();
    return;
  }

  if (
    typeof pluginManifest.name !== "string" ||
    !pluginNamePattern.test(pluginManifest.name)
  ) {
    addError(
      '"name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.',
    );
  }

  validateRequiredString(pluginManifest.displayName, "displayName");
  validateRequiredString(pluginManifest.version, "version");
  validateRequiredString(pluginManifest.description, "description");
  validateRequiredString(pluginManifest.license, "license");

  if (
    !pluginManifest.author ||
    typeof pluginManifest.author !== "object" ||
    typeof pluginManifest.author.name !== "string" ||
    pluginManifest.author.name.length === 0
  ) {
    addError("author.name is required in plugin.json.");
  }
  if (
    !Array.isArray(pluginManifest.keywords) ||
    pluginManifest.keywords.length === 0 ||
    pluginManifest.keywords.some(
      (keyword) => typeof keyword !== "string" || keyword.trim().length === 0,
    )
  ) {
    addError("keywords must be a non-empty string array.");
  }

  await ensureDirectory(path.join(repoRoot, ".cursor-plugin"), ".cursor-plugin");

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
      await validateManifestPath(repoRoot, pluginManifest.name, field, value);
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
