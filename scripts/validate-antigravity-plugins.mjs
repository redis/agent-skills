#!/usr/bin/env node

// Validates the Google Antigravity manifest for the redis-development plugin
// against the Antigravity Plugin Marketplace Publishing Guide: required core and
// Marketplace fields, component paths resolved from the plugin root, a square
// logo, and agreement with the Claude manifest so every marketplace ships the
// same version. See AGENTS.md, "Where Skills Live".

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginDir = path.join(repoRoot, "plugins", "redis-development");
const manifestDir = path.join(pluginDir, ".antigravity-plugin");
const manifestPath = path.join(manifestDir, "plugin.json");
const claudeManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
const errors = [];
const warnings = [];
const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const minLogoSize = 128;

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

// Antigravity resolves every component path from the plugin root, even though
// the manifest sits in .antigravity-plugin/.
function resolveInPlugin(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return null;
  const resolved = path.resolve(pluginDir, value);
  const relative = path.relative(pluginDir, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function validatePath(value, label) {
  const resolved = resolveInPlugin(value);
  if (resolved === null) {
    addError(`${label} must be a relative path that stays inside the plugin root.`);
    return null;
  }
  if (!(await exists(resolved))) {
    addError(`${label} references a missing path: ${value}`);
    return null;
  }
  return resolved;
}

async function pngSize(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(24);
    await handle.read(header, 0, 24, 0);
    if (header.toString("latin1", 12, 16) !== "IHDR") return null;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    await handle.close();
  }
}

// Reads the root <svg> width/height, falling back to the viewBox, and rejects
// scripts and event handlers, which have no place in a Marketplace logo.
async function svgSize(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  if (/<script\b|\son[a-z]+\s*=/i.test(source)) {
    addError(`plugin.json logo must not contain scripts or event handlers: ${path.relative(repoRoot, filePath)}`);
  }
  const root = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return null;
  const attribute = (attr) => root.match(new RegExp(`\\s${attr}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const width = parseFloat(attribute("width"));
  const height = parseFloat(attribute("height"));
  if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  const viewBox = attribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) return { width: viewBox[2], height: viewBox[3] };
  return null;
}

async function validateLogo(value) {
  if (requireString(value, "plugin.json logo") === null) return;
  if (/^https:\/\//.test(value)) return;
  const resolved = await validatePath(value, "plugin.json logo");
  if (resolved === null) return;
  const extension = path.extname(resolved).toLowerCase();
  if (extension !== ".png" && extension !== ".svg") {
    addError("plugin.json logo must be a .png, .svg, or https:// URL.");
    return;
  }
  const size = extension === ".svg" ? await svgSize(resolved) : await pngSize(resolved);
  if (size === null) {
    addError(`plugin.json logo is not a readable ${extension.slice(1).toUpperCase()} with a size: ${value}`);
  } else if (size.width !== size.height || size.width < minLogoSize) {
    addError(`plugin.json logo must be square and at least ${minLogoSize}px (got ${size.width}x${size.height}).`);
  }
}

async function validateSkills(value) {
  if (!Array.isArray(value) || value.length === 0) {
    addError('plugin.json skills must be a non-empty array of paths, e.g. ["./skills"].');
    return;
  }
  for (const [index, entry] of value.entries()) {
    const resolved = await validatePath(entry, `plugin.json skills[${index}]`);
    if (resolved === null) continue;
    const children = await fs.readdir(resolved, { withFileTypes: true });
    const skillCount = (
      await Promise.all(
        children
          .filter((child) => child.isDirectory())
          .map((child) => exists(path.join(resolved, child.name, "SKILL.md"))),
      )
    ).filter(Boolean).length;
    if (skillCount === 0) {
      addError(`plugin.json skills[${index}] contains no <skill-name>/SKILL.md directories: ${entry}`);
    }
  }
}

async function main() {
  const [manifest, claudeManifest] = await Promise.all([
    readJson(manifestPath, "Antigravity plugin manifest"),
    readJson(claudeManifestPath, "Claude plugin manifest"),
  ]);
  if (manifest === null || claudeManifest === null) return report();

  // Only plugin.json belongs in .antigravity-plugin/; everything else resolves
  // from the plugin root.
  const extras = (await fs.readdir(manifestDir)).filter((entry) => entry !== "plugin.json");
  if (extras.length > 0) {
    addError(`.antigravity-plugin/ must contain only plugin.json (found: ${extras.join(", ")}).`);
  }
  if (await exists(path.join(pluginDir, "plugin.json"))) {
    addError("Found both plugin.json and .antigravity-plugin/plugin.json; keep only the latter.");
  }

  const name = requireString(manifest.name, "plugin.json name");
  if (name !== null) {
    if (name.length > 64 || !namePattern.test(name)) {
      addError("plugin.json name must be lowercase kebab-case, 1-64 characters.");
    }
    if (name !== path.basename(pluginDir)) {
      addError(`plugin.json name must match the plugin directory (${path.basename(pluginDir)}).`);
    }
  }

  const description = requireString(manifest.description, "plugin.json description");
  if (description !== null && (description.length < 120 || description.length > 160)) {
    warnings.push(`plugin.json description is ${description.length} characters; 120-160 is recommended for Marketplace cards.`);
  }

  const displayName = requireString(manifest.displayName, "plugin.json displayName");
  if (displayName !== null && /\b(plugin|mcp)\s*$/i.test(displayName)) {
    addError('plugin.json displayName must not end with "Plugin" or "MCP".');
  }

  const version = requireString(manifest.version, "plugin.json version");
  if (version !== null && !semverPattern.test(version)) {
    addError("plugin.json version must be strict semver.");
  }

  const authorName = typeof manifest.author === "string" ? manifest.author : manifest.author?.name;
  requireString(authorName, "plugin.json author.name");

  await validateLogo(manifest.logo);

  const prompts = manifest.suggestedPrompts;
  if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > 3) {
    addError("plugin.json suggestedPrompts must contain one to three prompts.");
  } else {
    for (const [index, prompt] of prompts.entries()) {
      requireString(prompt, `plugin.json suggestedPrompts[${index}]`);
    }
  }

  if (manifest.keywords !== undefined) {
    if (!Array.isArray(manifest.keywords) || !manifest.keywords.every((k) => typeof k === "string" && k === k.toLowerCase())) {
      addError("plugin.json keywords must be an array of lowercase strings.");
    }
  }

  if (manifest.homepage !== undefined && !/^https:\/\//.test(manifest.homepage)) {
    addError("plugin.json homepage must be an https:// URL.");
  }

  await validateSkills(manifest.skills);

  if (manifest.mcpServers !== undefined) {
    await validatePath(manifest.mcpServers, "plugin.json mcpServers");
  }

  if (!(await exists(path.join(pluginDir, "README.md")))) {
    addError("plugins/redis-development/README.md is missing; the Marketplace renders it before install.");
  }

  for (const field of ["name", "version", "repository", "license"]) {
    if (manifest[field] !== claudeManifest[field]) {
      addError(`Antigravity and Claude plugin manifests must agree on ${field}.`);
    }
  }

  report();
}

function report() {
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length > 0) {
    console.error("Antigravity plugin validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Antigravity plugin validation passed.");
}

await main();
