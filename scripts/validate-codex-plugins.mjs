#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginDir = path.join(repoRoot, "plugins", "redis-development");
const codexManifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
const claudeManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
const errors = [];
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function addError(message) {
  errors.push(message);
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    addError(`${label} is missing or invalid (${path.relative(repoRoot, filePath)}): ${error.message}`);
    return null;
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(`${label} must be a non-empty string.`);
    return null;
  }
  return value;
}

function safePluginPath(value) {
  if (typeof value !== "string" || !value.startsWith("./")) return null;
  const resolved = path.resolve(pluginDir, value);
  const relative = path.relative(pluginDir, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

async function validatePath(value, label) {
  const resolved = safePluginPath(value);
  if (resolved === null) {
    addError(`${label} must start with "./" and stay inside the plugin root.`);
    return;
  }
  try {
    await fs.access(resolved);
  } catch {
    addError(`${label} references a missing path: ${value}`);
  }
}

async function main() {
  const [manifest, claudeManifest] = await Promise.all([
    readJson(codexManifestPath, "Codex plugin manifest"),
    readJson(claudeManifestPath, "Claude plugin manifest"),
  ]);
  if (manifest === null || claudeManifest === null) return report();

  if (JSON.stringify(manifest).includes("[TODO:")) {
    addError("Codex plugin manifest contains an unfinished TODO placeholder.");
  }

  const name = requireString(manifest.name, "plugin.json name");
  if (name !== path.basename(pluginDir)) {
    addError(`plugin.json name must match the plugin directory (${path.basename(pluginDir)}).`);
  }
  const version = requireString(manifest.version, "plugin.json version");
  if (version !== null && !semverPattern.test(version)) {
    addError("plugin.json version must be strict semver.");
  }
  requireString(manifest.description, "plugin.json description");
  requireString(manifest.author?.name, "plugin.json author.name");

  if (manifest.skills !== "./skills/") {
    addError('plugin.json skills must be "./skills/".');
  } else {
    await validatePath(manifest.skills, "plugin.json skills");
  }

  const interfaceMetadata = manifest.interface;
  if (interfaceMetadata === null || typeof interfaceMetadata !== "object" || Array.isArray(interfaceMetadata)) {
    addError("plugin.json interface must be an object.");
  } else {
    for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
      requireString(interfaceMetadata[field], `plugin.json interface.${field}`);
    }
    if (!Array.isArray(interfaceMetadata.capabilities) || interfaceMetadata.capabilities.length === 0 ||
        !interfaceMetadata.capabilities.every((value) => typeof value === "string" && value.trim())) {
      addError("plugin.json interface.capabilities must be a non-empty array of strings.");
    }
    if (!Array.isArray(interfaceMetadata.defaultPrompt) || interfaceMetadata.defaultPrompt.length === 0 ||
        interfaceMetadata.defaultPrompt.length > 3) {
      addError("plugin.json interface.defaultPrompt must contain one to three prompts.");
    } else {
      for (const [index, prompt] of interfaceMetadata.defaultPrompt.entries()) {
        if (typeof prompt !== "string" || prompt.length === 0 || prompt.length > 128) {
          addError(`plugin.json interface.defaultPrompt[${index}] must contain 1-128 characters.`);
        }
      }
    }
    for (const field of ["composerIcon", "logo", "logoDark"]) {
      if (interfaceMetadata[field] !== undefined) {
        await validatePath(interfaceMetadata[field], `plugin.json interface.${field}`);
      }
    }
    if (interfaceMetadata.screenshots !== undefined) {
      if (!Array.isArray(interfaceMetadata.screenshots)) {
        addError("plugin.json interface.screenshots must be an array.");
      } else {
        for (const [index, screenshot] of interfaceMetadata.screenshots.entries()) {
          await validatePath(screenshot, `plugin.json interface.screenshots[${index}]`);
        }
      }
    }
  }

  for (const field of ["name", "version", "repository", "license", "mcpServers"]) {
    if (manifest[field] !== claudeManifest[field]) {
      addError(`Codex and Claude plugin manifests must agree on ${field}.`);
    }
  }

  report();
}

function report() {
  if (errors.length > 0) {
    console.error("Codex plugin validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Codex plugin validation passed.");
}

await main();
