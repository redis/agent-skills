#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, "skills");

// Subdirectories that exist for repo tooling (not the agent runtime) and that
// skill-validator should accept without "unknown directory" warnings. The
// agentskills.io spec explicitly allows additional files and directories at
// the skill root.
const ALLOW_DIRS = ["evals"];

const options = parseArgs(process.argv.slice(2));
const skillDirs = resolveSkillDirs(options);

if (skillDirs.length === 0) {
  const message = options.changedBaseRef
    ? `No changed skill directories found against ${options.changedBaseRef}.`
    : "No skill directories found.";
  console.log(message);
  writeStepSummary(`## Skill Structure Validation\n\n${message}\n`);
  process.exit(0);
}

let totalErrors = 0;
let totalWarnings = 0;
const summaries = [];

for (const skillDir of skillDirs) {
  const result = validateSkill(skillDir);
  totalErrors += result.errors;
  totalWarnings += result.warnings;
  summaries.push(result);

  for (const item of result.results) {
    if (item.level !== "warning" && item.level !== "error") continue;

    emitWarning({
      file: item.file ? path.join(path.relative(repoRoot, skillDir), item.file) : path.relative(repoRoot, skillDir),
      title: `${item.category || "skill-validator"} ${item.level}`,
      message: item.message,
    });
  }
}

writeSummary(summaries, { totalErrors, totalWarnings, enforce: options.enforce });
printSummary(summaries, { totalErrors, totalWarnings, enforce: options.enforce });

if (options.enforce && totalErrors > 0) {
  process.exit(1);
}

process.exit(0);

function parseArgs(args) {
  const parsed = {
    all: false,
    enforce: false,
    changedBaseRef: null,
    paths: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--all":
        parsed.all = true;
        break;
      case "--enforce":
        parsed.enforce = true;
        break;
      case "--changed":
      case "--base-ref": {
        const value = args[index + 1];
        if (!value) {
          fail(`Missing value for ${arg}.`);
        }
        parsed.changedBaseRef = value;
        index += 1;
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          fail(`Unknown option: ${arg}`);
        }
        parsed.paths.push(arg);
    }
  }

  if (!parsed.all && !parsed.changedBaseRef && parsed.paths.length === 0) {
    parsed.all = true;
  }

  return parsed;
}

function printHelp() {
  console.log(`Validate Agent Skill package structure with skill-validator.

Usage:
  node scripts/validate-skill-structure.mjs [options] [skill-dir...]

Options:
  --all                 Validate all skill directories under skills/.
  --changed <base-ref>  Validate skill directories changed against origin/<base-ref>...HEAD.
  --enforce             Exit non-zero when skill-validator reports errors.
  --help                Show this help text.
`);
}

function resolveSkillDirs(parsed) {
  const dirs = new Set();

  if (parsed.all) {
    for (const dirent of safeReadDir(skillsRoot)) {
      if (!dirent.isDirectory()) continue;
      const skillDir = path.join(skillsRoot, dirent.name);
      if (hasSkillFile(skillDir)) {
        dirs.add(skillDir);
      }
    }
  }

  if (parsed.changedBaseRef) {
    for (const skillDir of changedSkillDirs(parsed.changedBaseRef)) {
      dirs.add(skillDir);
    }
  }

  for (const inputPath of parsed.paths) {
    const skillDir = path.resolve(repoRoot, inputPath);
    if (!hasSkillFile(skillDir)) {
      fail(`Not a skill directory with SKILL.md: ${inputPath}`);
    }
    dirs.add(skillDir);
  }

  return Array.from(dirs).sort((left, right) =>
    path.relative(repoRoot, left).localeCompare(path.relative(repoRoot, right)),
  );
}

function changedSkillDirs(baseRef) {
  const diff = spawnSync(
    "git",
    ["diff", "--name-only", `origin/${baseRef}...HEAD`, "--", "skills/"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  if (diff.status !== 0) {
    const detail = diff.stderr.trim() || diff.stdout.trim();
    fail(`Could not diff changed skills against origin/${baseRef}: ${detail}`);
  }

  const skillNames = new Set();
  for (const file of diff.stdout.split(/\r?\n/)) {
    if (!file.trim()) continue;
    const parts = file.split("/");
    if (parts[0] === "skills" && parts[1]) {
      skillNames.add(parts[1]);
    }
  }

  return Array.from(skillNames)
    .map((name) => path.join(skillsRoot, name))
    .filter((skillDir) => hasSkillFile(skillDir));
}

function validateSkill(skillDir) {
  const args = ["check", "-o", "json"];
  if (ALLOW_DIRS.length > 0) {
    args.push(`--allow-dirs=${ALLOW_DIRS.join(",")}`);
  }
  args.push(skillDir);

  const command = spawnSync("skill-validator", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (command.error) {
    fail(`Failed to run skill-validator: ${command.error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(command.stdout);
  } catch (error) {
    const output = [command.stdout, command.stderr].filter(Boolean).join("\n").trim();
    fail(`skill-validator did not return JSON for ${path.relative(repoRoot, skillDir)}: ${error.message}\n${output}`);
  }

  return {
    skillDir,
    skillLabel: path.relative(repoRoot, skillDir),
    errors: Number(parsed.errors ?? 0),
    warnings: Number(parsed.warnings ?? 0),
    results: Array.isArray(parsed.results) ? parsed.results : [],
  };
}

function writeSummary(summariesToWrite, totals) {
  const lines = [
    "## Skill Structure Validation",
    "",
    totals.enforce
      ? "Mode: **enforced**. Validator errors fail this check."
      : "Mode: **advisory**. Validator findings are reported as warnings and do not fail this check.",
    "",
    `Validated ${summariesToWrite.length} skill${summariesToWrite.length === 1 ? "" : "s"}.`,
    "",
    "| Skill | Validator Errors | Validator Warnings |",
    "|---|---:|---:|",
  ];

  for (const summary of summariesToWrite) {
    lines.push(`| \`${summary.skillLabel}\` | ${summary.errors} | ${summary.warnings} |`);
  }

  lines.push("");
  lines.push(`Total validator errors: **${totals.totalErrors}**`);
  lines.push(`Total validator warnings: **${totals.totalWarnings}**`);

  const findings = summariesToWrite.flatMap((summary) =>
    summary.results
      .filter((item) => item.level === "warning" || item.level === "error")
      .map((item) => ({
        ...item,
        skillLabel: summary.skillLabel,
      })),
  );

  if (findings.length > 0) {
    lines.push("");
    lines.push("### Findings");
    lines.push("");
    lines.push("| Level | Category | File | Message |");
    lines.push("|---|---|---|---|");
    for (const finding of findings) {
      lines.push(
        `| ${escapeMarkdown(finding.level)} | ${escapeMarkdown(finding.category ?? "")} | ${escapeMarkdown(finding.file ? `${finding.skillLabel}/${finding.file}` : finding.skillLabel)} | ${escapeMarkdown(finding.message ?? "")} |`,
      );
    }
  }

  writeStepSummary(`${lines.join("\n")}\n`);
}

function printSummary(summariesToPrint, totals) {
  console.log("Skill structure validation complete.");
  for (const summary of summariesToPrint) {
    console.log(`- ${summary.skillLabel}: ${summary.errors} errors, ${summary.warnings} warnings`);
  }
  console.log(`Total: ${totals.totalErrors} errors, ${totals.totalWarnings} warnings`);
  if (!totals.enforce) {
    console.log("Advisory mode: validator findings do not fail this command.");
  }
}

function writeStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(summaryPath, markdown, "utf8");
}

function emitWarning({ file, title, message }) {
  const properties = [
    file ? `file=${escapeAnnotationProperty(file)}` : null,
    title ? `title=${escapeAnnotationProperty(title)}` : null,
  ]
    .filter(Boolean)
    .join(",");
  console.log(`::warning ${properties}::${escapeAnnotationMessage(message)}`);
}

function hasSkillFile(skillDir) {
  try {
    return statSync(path.join(skillDir, "SKILL.md")).isFile();
  } catch {
    return false;
  }
}

function safeReadDir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function escapeAnnotationMessage(value) {
  return String(value ?? "")
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeAnnotationProperty(value) {
  return escapeAnnotationMessage(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
