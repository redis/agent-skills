#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginDir = path.join(repoRoot, "plugins", "redis-development");
const pluginSkillsDir = path.join(pluginDir, "skills");
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
    return null;
  }
  try {
    await fs.access(resolved);
    return resolved;
  } catch {
    addError(`${label} references a missing path: ${value}`);
    return null;
  }
}

async function validateSquarePng(value, label) {
  const resolved = await validatePath(value, label);
  if (resolved === null) return;
  if (path.extname(resolved).toLowerCase() !== ".png") {
    addError(`${label} must reference a PNG image.`);
    return;
  }

  const image = await fs.readFile(resolved);
  const pngSignature = "89504e470d0a1a0a";
  if (image.length < 24 || image.subarray(0, 8).toString("hex") !== pngSignature) {
    addError(`${label} must reference a valid PNG image.`);
    return;
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== height) {
    addError(`${label} must be square; found ${width}x${height}.`);
  }
}

function quotedYamlValue(source, field, label) {
  const match = source.match(new RegExp(`^  ${field}: "([^"]+)"\\s*$`, "m"));
  if (match === null) {
    addError(`${label} must be present under interface and use a quoted string value.`);
    return null;
  }
  return match[1];
}

async function validateSkillInterfaces() {
  const entries = await fs.readdir(pluginSkillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(pluginSkillsDir, entry.name, "SKILL.md");
    try {
      await fs.access(skillFile);
    } catch {
      continue;
    }

    const label = `skills/${entry.name}/agents/openai.yaml`;
    let source;
    try {
      source = await fs.readFile(path.join(pluginSkillsDir, entry.name, "agents", "openai.yaml"), "utf8");
    } catch {
      addError(`${label} is required for skill interface metadata.`);
      continue;
    }
    if (!/^interface:\s*$/m.test(source)) {
      addError(`${label} must contain a top-level interface object.`);
      continue;
    }

    quotedYamlValue(source, "display_name", `${label} interface.display_name`);
    const shortDescription = quotedYamlValue(
      source,
      "short_description",
      `${label} interface.short_description`,
    );
    if (shortDescription !== null && (shortDescription.length < 25 || shortDescription.length > 64)) {
      addError(`${label} interface.short_description must contain 25-64 characters.`);
    }
    const brandColor = quotedYamlValue(source, "brand_color", `${label} interface.brand_color`);
    if (brandColor !== null && !/^#[0-9A-F]{6}$/i.test(brandColor)) {
      addError(`${label} interface.brand_color must use #RRGGBB.`);
    }
    const defaultPrompt = quotedYamlValue(
      source,
      "default_prompt",
      `${label} interface.default_prompt`,
    );
    if (defaultPrompt !== null && !defaultPrompt.includes(`$${entry.name}`)) {
      addError(`${label} interface.default_prompt must mention $${entry.name}.`);
    }
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
    const composerIcon = requireString(
      interfaceMetadata.composerIcon,
      "plugin.json interface.composerIcon",
    );
    if (composerIcon !== null) {
      await validateSquarePng(composerIcon, "plugin.json interface.composerIcon");
    }
    for (const field of ["logo", "logoDark"]) {
      if (interfaceMetadata[field] !== undefined) {
        await validateSquarePng(interfaceMetadata[field], `plugin.json interface.${field}`);
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

  for (const field of ["name", "version", "repository", "license"]) {
    if (manifest[field] !== claudeManifest[field]) {
      addError(`Codex and Claude plugin manifests must agree on ${field}.`);
    }
  }

  await validateSkillInterfaces();

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
