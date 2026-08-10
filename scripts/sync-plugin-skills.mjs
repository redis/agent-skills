#!/usr/bin/env node

// Vendors real copies of every skill from the top-level `skills/` source of
// truth into the Claude Code plugin. The plugin directory fetches only the
// `plugins/redis-development` subdirectory and advances our pinned commit only
// when that subdirectory's own contents change, so a skill has to exist there
// as real files to be published at all. See AGENTS.md, "Where Skills Live".
//
// Usage:
//   node scripts/sync-plugin-skills.mjs           # write the copies
//   node scripts/sync-plugin-skills.mjs --check   # verify only, no writes

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const PLUGIN_SKILLS_RELATIVE = path.join("plugins", "redis-development", "skills");

// Cursor reads each `.cursor-plugin/` manifest from `skills/`, where its
// marketplace `pluginRoot` points, so the published copy leaves it out.
const EXCLUDED_TOP_LEVEL = new Set([".cursor-plugin"]);

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, "skills");
const pluginSkillsRoot = path.join(repoRoot, PLUGIN_SKILLS_RELATIVE);
const checkMode = process.argv.includes("--check");
const problems = [];

await main();

async function main() {
  if ((await realDirectory(skillsRoot)) !== true) {
    if (problems.length === 0) {
      problems.push("skills/ is missing.");
    }
    report();
    return;
  }

  const skills = await listSkills();
  if (skills.length === 0) {
    problems.push("No skills with a SKILL.md found under skills/.");
    report();
    return;
  }

  const expected = new Map();
  for (const skill of skills) {
    const skillRoot = path.join(skillsRoot, skill);
    for (const relative of await listFiles(skillRoot, { applyExcludes: true })) {
      expected.set(path.join(skill, relative), path.join(skillRoot, relative));
    }
  }

  if (checkMode) {
    await check(expected);
  } else {
    await write(expected);
  }

  report(skills.length, expected.size);
}

async function listSkills() {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    // A symlinked skill directory would otherwise be skipped for not being a
    // directory, dropping the skill from the plugin without a word.
    if (entry.isSymbolicLink()) {
      problems.push(`skills/${entry.name} is a symlink; skills must be real directories.`);
      continue;
    }
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
    const stats = await fs.lstat(skillFile).catch(() => null);
    if (!stats) continue;
    if (!stats.isFile()) {
      problems.push(`skills/${entry.name}/SKILL.md is not a regular file.`);
      continue;
    }
    skills.push(entry.name);
  }

  return skills.sort();
}

// Lists files relative to `root`. A symlink is reported rather than followed:
// one escaping a plugin root is exactly what stops the plugin from publishing.
async function listFiles(root, { applyExcludes = false } = {}) {
  const files = [];
  const pending = [""];

  while (pending.length > 0) {
    const relativeDir = pending.pop();
    const entries = await fs.readdir(path.join(root, relativeDir), { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      if (applyExcludes && EXCLUDED_TOP_LEVEL.has(relativePath.split(path.sep)[0])) continue;

      if (entry.isSymbolicLink()) {
        problems.push(
          `${path.relative(repoRoot, path.join(root, relativePath))} is a symlink; skills must be real files on both sides.`,
        );
        continue;
      }

      if (entry.isDirectory()) {
        pending.push(relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  return files.sort();
}

async function check(expected) {
  // A symlink at the vendored root would make every byte comparison below pass
  // against the source tree it points at, while git still records the alias.
  const rootState = await realDirectory(pluginSkillsRoot);
  if (rootState === false) return;

  const actual = rootState === null ? [] : await listFiles(pluginSkillsRoot);
  const actualSet = new Set(actual);

  for (const relativePath of expected.keys()) {
    if (!actualSet.has(relativePath)) {
      problems.push(`missing from the plugin: ${vendoredLabel(relativePath)}`);
    }
  }

  for (const relativePath of actual) {
    if (!expected.has(relativePath)) {
      problems.push(`not in skills/ any more: ${vendoredLabel(relativePath)}`);
      continue;
    }
    const [source, vendored] = await Promise.all([
      fs.readFile(expected.get(relativePath)),
      fs.readFile(path.join(pluginSkillsRoot, relativePath)),
    ]);
    if (!source.equals(vendored)) {
      problems.push(`out of date: ${vendoredLabel(relativePath)}`);
    }
  }
}

async function write(expected) {
  // The run is about to exit non-zero, and wiping first would leave the plugin
  // empty rather than merely stale.
  if (problems.length > 0) return;

  // Wholesale rewrite: every file under the plugin's skills/ is generated, so
  // clearing it first is what removes a renamed or deleted skill.
  await fs.rm(pluginSkillsRoot, { recursive: true, force: true });

  for (const [relativePath, source] of expected) {
    const destination = path.join(pluginSkillsRoot, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}

function vendoredLabel(relativePath) {
  return path.join(PLUGIN_SKILLS_RELATIVE, relativePath);
}

// true = real directory, false = present but unusable (problem recorded),
// null = absent.
async function realDirectory(target) {
  const stats = await fs.lstat(target).catch(() => null);
  if (!stats) return null;

  const label = path.relative(repoRoot, target);
  if (stats.isSymbolicLink()) {
    problems.push(`${label} is a symlink; it must be a real directory.`);
    return false;
  }
  if (!stats.isDirectory()) {
    problems.push(`${label} is not a directory.`);
    return false;
  }
  return true;
}

function report(skillCount, fileCount) {
  if (problems.length > 0) {
    console.error(
      checkMode
        ? `Vendored plugin skills are out of sync with skills/ (${problems.length} problem${problems.length === 1 ? "" : "s"}):`
        : `Could not vendor plugin skills (${problems.length} problem${problems.length === 1 ? "" : "s"}):`,
    );
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    if (checkMode) {
      console.error("\nRun `npm run sync:plugins` to regenerate them.");
    }
    process.exit(1);
  }

  console.log(
    checkMode
      ? `Vendored plugin skills match skills/ (${skillCount} skills, ${fileCount} files).`
      : `Vendored ${fileCount} files from ${skillCount} skills into ${PLUGIN_SKILLS_RELATIVE}/.`,
  );
}
