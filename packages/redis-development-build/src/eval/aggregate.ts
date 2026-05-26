/**
 * npm entrypoint:
 *   npm run eval:aggregate -- [options]
 *
 * Also triggered automatically by:
 *   npm run eval -- [options]
 *
 * Purpose:
 *   Reads per-model `benchmark.json` files from `eval-workspaces/`, combines
 *   them into one cross-model benchmark, and writes
 *   `aggregate-benchmark.json`, `aggregate-benchmark.md`, and
 *   `aggregate-benchmark.html` into the selected iteration folder.
 */
import { readdir, readFile, writeFile } from "fs/promises";
import type { Dirent } from "fs";
import { join, relative } from "path";
import { renderAggregateHtml } from "./html-template.js";
import type {
  BaselineComparison,
  BaselineModelSnapshot,
  BaselineOverallSnapshot,
} from "./html-template.js";
import {
  EVAL_WORKSPACES_DIR,
  formatUsd,
  isNodeError,
  numberOrZero,
  percent,
  readJson,
  resolveRepoPath,
  REPO_ROOT,
  signedNumber,
  signedPercent,
  signedUsd,
  sumModelUsageCost,
} from "./utils.js";

interface BenchmarkRun {
  eval_id: number;
  eval_name?: string;
  configuration: string;
  run_number: number;
  result: {
    pass_rate?: number;
    passed?: number;
    failed?: number;
    total?: number;
    time_seconds?: number;
    tokens?: number;
    tool_calls?: number;
    errors?: number;
  };
}

interface ModelBenchmark {
  metadata: {
    skill_name?: string;
    executor_model?: string;
    executor_provider?: string;
    analyzer_model?: string;
    analyzer_provider?: string;
    timestamp?: string;
    evals_run?: number[];
    runs_per_configuration?: number;
  };
  runs: BenchmarkRun[];
}

interface EvalDefinitionFile {
  evals?: Array<{
    id?: number | string;
    name?: string;
  }>;
}

interface CostSummary {
  generation_usd: number;
  grading_usd: number;
  total_usd: number;
  with_skill_usd: number;
  without_skill_usd: number;
  delta_usd: number;
  runs_with_cost: number;
}

interface BaselineAggregateReport {
  generated_at?: string;
  input_root?: string;
  overall?: BaselineOverallReport;
  models?: BaselineModelReport[];
}

interface BaselineOverallReport {
  mean_delta_pass_rate?: number;
  mean_delta_tokens?: number;
  mean_delta_time_seconds?: number;
  mean_delta_cost_usd?: number;
}

interface BaselineModelReport {
  model?: string;
  delta?: {
    pass_rate?: number;
    tokens?: number;
    time_seconds?: number;
  };
  cost?: {
    delta_usd?: number;
  };
  verdict?: string;
}

interface CliOptions {
  inputRoot?: string;
  skill?: string;
  suite?: string;
  iteration: string;
  help: boolean;
}

type ModelSummary = Awaited<ReturnType<typeof summarizeModel>>;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const inputRoots = await resolveInputRoots(options);
  if (inputRoots.length === 0) {
    throw new Error(`No benchmark output roots matched the selected filters.`);
  }

  let reportsWritten = 0;
  for (const inputRoot of inputRoots) {
    const benchmarkEntries = await readBenchmarks(inputRoot);
    if (benchmarkEntries.length === 0) {
      if (options.inputRoot) {
        throw new Error(
          `No per-model benchmark.json files found under ${relative(
            REPO_ROOT,
            inputRoot,
          )}. Run the eval first.`,
        );
      }
      console.warn(
        `Skipping ${relative(
          REPO_ROOT,
          inputRoot,
        )}; no per-model benchmark.json files found.`,
      );
      continue;
    }

    const report = await buildAggregateReport(inputRoot, benchmarkEntries);
    await writeFile(
      join(inputRoot, "aggregate-benchmark.json"),
      `${JSON.stringify(report.json, null, 2)}\n`,
      "utf-8",
    );
    await writeFile(
      join(inputRoot, "aggregate-benchmark.md"),
      report.markdown,
      "utf-8",
    );
    await writeFile(
      join(inputRoot, "aggregate-benchmark.html"),
      report.html,
      "utf-8",
    );

    reportsWritten += 1;
    console.log(
      `Wrote ${relative(REPO_ROOT, join(inputRoot, "aggregate-benchmark.md"))}`,
    );
    console.log(
      `Wrote ${relative(REPO_ROOT, join(inputRoot, "aggregate-benchmark.json"))}`,
    );
    console.log(
      `Wrote ${relative(REPO_ROOT, join(inputRoot, "aggregate-benchmark.html"))}`,
    );
  }

  if (reportsWritten === 0) {
    throw new Error(`No aggregate reports were written.`);
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    iteration: "iteration-1",
    help: false,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const next = () => {
      const value = args[++index];
      if (!value) throw new Error(`Missing value for ${arg}`);
      return value;
    };

    switch (arg) {
      case "--input-root":
        options.inputRoot = resolveRepoPath(next());
        break;
      case "--skill":
        options.skill = next();
        break;
      case "--suite":
        options.suite = next();
        break;
      case "--iteration":
        options.iteration = next();
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Aggregate skill eval benchmarks

Usage:
  npm run eval:aggregate -- [options]

Options:
  --input-root <path>   Aggregate one explicit iteration directory.
  --skill <skill-name>  Filter output roots to one skill.
  --suite <suite-name>  Filter output roots to one eval suite.
  --iteration <name>    Output iteration name. Default: iteration-1.

Examples:
  npm run eval:aggregate
  npm run eval:aggregate -- --skill redis-development --suite data-structures-key-naming
`);
}

async function resolveInputRoots(options: CliOptions): Promise<string[]> {
  if (options.inputRoot) return [options.inputRoot];

  const roots: string[] = [];
  let skillEntries: Dirent[];

  try {
    skillEntries = await readdir(EVAL_WORKSPACES_DIR, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  for (const skillEntry of skillEntries) {
    if (!skillEntry.isDirectory()) continue;
    if (options.skill && skillEntry.name !== options.skill) continue;

    const skillOutputDir = join(EVAL_WORKSPACES_DIR, skillEntry.name);
    let suiteEntries: Dirent[];
    try {
      suiteEntries = await readdir(skillOutputDir, { withFileTypes: true });
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") continue;
      throw error;
    }

    for (const suiteEntry of suiteEntries) {
      if (!suiteEntry.isDirectory()) continue;
      if (options.suite && suiteEntry.name !== options.suite) continue;

      const inputRoot = join(
        skillOutputDir,
        suiteEntry.name,
        options.iteration,
      );
      try {
        await readdir(inputRoot);
        roots.push(inputRoot);
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") continue;
        throw error;
      }
    }
  }

  return roots.sort((left, right) =>
    relative(REPO_ROOT, left).localeCompare(relative(REPO_ROOT, right)),
  );
}

async function readBenchmarks(inputRoot: string): Promise<
  Array<{
    modelDir: string;
    benchmark: ModelBenchmark;
  }>
> {
  const entries = await readdir(inputRoot, { withFileTypes: true });
  const benchmarks = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const benchmarkPath = join(inputRoot, entry.name, "benchmark.json");
    try {
      const raw = await readFile(benchmarkPath, "utf-8");
      benchmarks.push({
        modelDir: entry.name,
        benchmark: JSON.parse(raw) as ModelBenchmark,
      });
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") continue;
      throw error;
    }
  }

  return benchmarks.sort((left, right) =>
    modelIdentity(left.modelDir, left.benchmark).model.localeCompare(
      modelIdentity(right.modelDir, right.benchmark).model,
    ),
  );
}

async function buildAggregateReport(
  inputRoot: string,
  entries: Array<{ modelDir: string; benchmark: ModelBenchmark }>,
): Promise<{ json: unknown; markdown: string; html: string }> {
  const generatedAt = new Date().toISOString();
  const inputRootLabel = relative(REPO_ROOT, inputRoot);
  const context = inferReportContext(inputRoot, entries);
  const evalNames = await readEvalNames(context);
  const logoDataUri = await readSkillLogoDataUri(context);
  const modelSummaries = await Promise.all(
    entries.map(({ modelDir, benchmark }) =>
      summarizeModel(inputRoot, modelDir, benchmark),
    ),
  );
  const evalSummaries = summarizeByEval(entries, evalNames);
  const overall = summarizeOverall(modelSummaries);
  const baselineComparison = await readBaselineComparison(context, {
    modelSummaries,
    overall,
  });

  const json = {
    generated_at: generatedAt,
    input_root: inputRootLabel,
    context,
    models: modelSummaries,
    evals: evalSummaries,
    overall,
    baseline_comparison: baselineComparison,
  };

  const markdown = renderMarkdown({
    generatedAt,
    inputRoot,
    context,
    modelSummaries,
    evalSummaries,
    overall,
    baselineComparison,
  });

  const html = renderAggregateHtml({
    generatedAt,
    inputRootLabel,
    logoDataUri,
    context,
    modelSummaries,
    evalSummaries,
    overall,
    baselineComparison,
  });

  return { json, markdown, html };
}

async function readSkillLogoDataUri(_context: {
  skill_name: string;
}): Promise<string | undefined> {
  const logoPath = join(REPO_ROOT, "assets", "redis-logo.png");

  try {
    const logo = await readFile(logoPath);
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function inferReportContext(
  inputRoot: string,
  entries: Array<{ modelDir: string; benchmark: ModelBenchmark }>,
): { skill_name: string; suite_name: string } {
  const inputParts = relative(REPO_ROOT, inputRoot).split(/[\\/]/);
  const skillFromPath =
    inputParts[0] === "eval-workspaces" ? (inputParts[1] ?? "") : "";
  const suiteFromPath =
    inputParts[0] === "eval-workspaces" ? (inputParts[2] ?? "") : "";
  const skillFromMetadata =
    entries
      .map((entry) =>
        normalizedMetadataValue(entry.benchmark.metadata.skill_name),
      )
      .find((value): value is string => Boolean(value)) ?? "";

  return {
    skill_name: skillFromPath || skillFromMetadata,
    suite_name: suiteFromPath,
  };
}

async function readEvalNames(context: {
  skill_name: string;
  suite_name: string;
}): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  if (!context.skill_name || !context.suite_name) return names;

  const evalsPath = join(
    REPO_ROOT,
    "skills",
    context.skill_name,
    "evals",
    context.suite_name,
    "evals.json",
  );

  try {
    const parsed = await readJson<EvalDefinitionFile>(evalsPath);
    for (const evalDefinition of parsed.evals ?? []) {
      const id = Number(evalDefinition.id);
      const name = evalDefinition.name?.trim();
      if (Number.isFinite(id) && name) names.set(id, name);
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return names;
    throw error;
  }

  return names;
}

async function readBaselineComparison(
  context: { skill_name: string; suite_name: string },
  current: {
    modelSummaries: ModelSummary[];
    overall: ReturnType<typeof summarizeOverall>;
  },
): Promise<BaselineComparison | undefined> {
  if (!context.skill_name || !context.suite_name) return undefined;

  const baselinePath = join(
    REPO_ROOT,
    "skills",
    context.skill_name,
    "evals",
    context.suite_name,
    "baselines",
    "aggregate-benchmark.json",
  );

  let baseline: BaselineAggregateReport;
  try {
    baseline = await readJson<BaselineAggregateReport>(baselinePath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    throw error;
  }

  const baselineOverall = baselineOverallSnapshot(baseline.overall);
  const currentOverall = currentOverallSnapshot(current.overall);
  const baselineModels = new Map<string, BaselineModelReport>();

  for (const model of baseline.models ?? []) {
    if (model.model) baselineModels.set(model.model, model);
  }

  const modelComparisons = current.modelSummaries.map((summary) => {
    const baselineModel = baselineModels.get(summary.model);
    const currentSnapshot = currentModelSnapshot(summary);
    if (!baselineModel) {
      return {
        model: summary.model,
        status: "new" as const,
        current: currentSnapshot,
        current_verdict: summary.verdict,
      };
    }

    const baselineSnapshot = baselineModelSnapshot(baselineModel);
    return {
      model: summary.model,
      status: "compared" as const,
      baseline: baselineSnapshot,
      current: currentSnapshot,
      change: subtractModelSnapshot(currentSnapshot, baselineSnapshot),
      baseline_verdict: baselineModel.verdict ?? "",
      current_verdict: summary.verdict,
    };
  });

  return {
    path: relative(REPO_ROOT, baselinePath),
    generated_at: baseline.generated_at ?? "",
    input_root: baseline.input_root ?? "",
    overall: {
      baseline: baselineOverall,
      current: currentOverall,
      change: subtractOverallSnapshot(currentOverall, baselineOverall),
    },
    models: modelComparisons,
    missing_models: [...baselineModels.keys()].filter(
      (model) =>
        !current.modelSummaries.some((summary) => summary.model === model),
    ),
  };
}

async function summarizeModel(
  inputRoot: string,
  modelDir: string,
  benchmark: ModelBenchmark,
) {
  const identity = modelIdentity(modelDir, benchmark);
  const withSkillRuns = benchmark.runs.filter(
    (run) => run.configuration === "with_skill",
  );
  const withoutSkillRuns = benchmark.runs.filter(
    (run) => run.configuration === "without_skill",
  );
  const withSkill = summarizeRuns(withSkillRuns);
  const withoutSkill = summarizeRuns(withoutSkillRuns);
  const delta = {
    pass_rate: withSkill.pass_rate - withoutSkill.pass_rate,
    time_seconds: withSkill.time_seconds - withoutSkill.time_seconds,
    tokens: withSkill.tokens - withoutSkill.tokens,
  };

  return {
    model_dir: modelDir,
    model: identity.model,
    provider: identity.provider,
    analyzer_model: benchmark.metadata.analyzer_model ?? "",
    runs_per_configuration:
      benchmark.metadata.runs_per_configuration ??
      inferRunsPerConfiguration(benchmark.runs),
    evals_run: benchmark.metadata.evals_run ?? inferEvalIds(benchmark.runs),
    without_skill: withoutSkill,
    with_skill: withSkill,
    delta,
    cost: await summarizeModelCost(join(inputRoot, modelDir), benchmark),
    verdict: classifyDelta(delta.pass_rate, delta.tokens),
  };
}

async function summarizeModelCost(
  modelWorkspace: string,
  benchmark: ModelBenchmark,
): Promise<CostSummary> {
  let generationUsd = 0;
  let gradingUsd = 0;
  let withSkillUsd = 0;
  let withoutSkillUsd = 0;
  let withSkillRuns = 0;
  let withoutSkillRuns = 0;
  let runsWithCost = 0;

  for (const run of benchmark.runs) {
    const runDir = join(
      modelWorkspace,
      `eval-${run.eval_id}`,
      run.configuration,
      `run-${run.run_number}`,
    );
    const timing = await readOptionalJson(join(runDir, "timing.json"));
    const grading = await readOptionalJson(join(runDir, "grading.json"));
    const generationCost = extractCostUsd(timing);
    const gradingCost = extractCostUsd(grading);
    const runCost = generationCost + gradingCost;

    generationUsd += generationCost;
    gradingUsd += gradingCost;
    if (runCost > 0) runsWithCost += 1;

    if (run.configuration === "with_skill") {
      withSkillUsd += runCost;
      withSkillRuns += 1;
    } else if (run.configuration === "without_skill") {
      withoutSkillUsd += runCost;
      withoutSkillRuns += 1;
    }
  }

  const meanWithSkillUsd =
    withSkillRuns === 0 ? 0 : withSkillUsd / withSkillRuns;
  const meanWithoutSkillUsd =
    withoutSkillRuns === 0 ? 0 : withoutSkillUsd / withoutSkillRuns;

  return {
    generation_usd: roundUsd(generationUsd),
    grading_usd: roundUsd(gradingUsd),
    total_usd: roundUsd(generationUsd + gradingUsd),
    with_skill_usd: roundUsd(withSkillUsd),
    without_skill_usd: roundUsd(withoutSkillUsd),
    delta_usd: roundUsd(meanWithSkillUsd - meanWithoutSkillUsd),
    runs_with_cost: runsWithCost,
  };
}

async function readOptionalJson(filePath: string): Promise<any | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function extractCostUsd(value: any): number {
  return (
    numberOrZero(value?.cost?.total_usd) ||
    numberOrZero(value?.raw_result?.total_cost_usd) ||
    sumModelUsageCost(value?.raw_result?.modelUsage)
  );
}

function summarizeByEval(
  entries: Array<{ modelDir: string; benchmark: ModelBenchmark }>,
  evalNames: Map<number, string>,
) {
  const evalIds = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.benchmark.runs.map((run) => run.eval_id),
      ),
    ),
  ].sort((left, right) => left - right);

  return evalIds.map((evalId) => {
    const rows = entries.map(({ modelDir, benchmark }) => {
      const identity = modelIdentity(modelDir, benchmark);
      const evalRuns = benchmark.runs.filter((run) => run.eval_id === evalId);
      const evalName =
        evalNames.get(evalId) ??
        normalizedEvalName(evalRuns[0]?.eval_name, evalId) ??
        `eval-${evalId}`;
      const withSkill = summarizeRuns(
        evalRuns.filter((run) => run.configuration === "with_skill"),
      );
      const withoutSkill = summarizeRuns(
        evalRuns.filter((run) => run.configuration === "without_skill"),
      );
      return {
        model: identity.model,
        eval_name: evalName,
        with_skill: withSkill,
        without_skill: withoutSkill,
        delta: {
          pass_rate: withSkill.pass_rate - withoutSkill.pass_rate,
          time_seconds: withSkill.time_seconds - withoutSkill.time_seconds,
          tokens: withSkill.tokens - withoutSkill.tokens,
        },
      };
    });

    const withSkill = summarizeRunSummaries(rows.map((row) => row.with_skill));
    const withoutSkill = summarizeRunSummaries(
      rows.map((row) => row.without_skill),
    );

    return {
      eval_id: evalId,
      eval_name:
        evalNames.get(evalId) ?? rows[0]?.eval_name ?? `eval-${evalId}`,
      without_skill: withoutSkill,
      with_skill: withSkill,
      delta: {
        pass_rate: withSkill.pass_rate - withoutSkill.pass_rate,
        time_seconds: withSkill.time_seconds - withoutSkill.time_seconds,
        tokens: withSkill.tokens - withoutSkill.tokens,
      },
      mean_delta_pass_rate: withSkill.pass_rate - withoutSkill.pass_rate,
      models: rows,
    };
  });
}

function normalizedEvalName(
  value: string | undefined,
  evalId: number,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed === `eval-${evalId}` || trimmed === `eval${evalId}`)
    return undefined;
  return trimmed;
}

function summarizeOverall(modelSummaries: ModelSummary[]) {
  return {
    models: modelSummaries.length,
    total_cost_usd: roundUsd(
      modelSummaries.reduce((sum, summary) => sum + summary.cost.total_usd, 0),
    ),
    generation_cost_usd: roundUsd(
      modelSummaries.reduce(
        (sum, summary) => sum + summary.cost.generation_usd,
        0,
      ),
    ),
    grading_cost_usd: roundUsd(
      modelSummaries.reduce(
        (sum, summary) => sum + summary.cost.grading_usd,
        0,
      ),
    ),
    mean_delta_pass_rate: mean(
      modelSummaries.map((summary) => summary.delta.pass_rate),
    ),
    mean_delta_tokens: mean(
      modelSummaries.map((summary) => summary.delta.tokens),
    ),
    mean_delta_time_seconds: mean(
      modelSummaries.map((summary) => summary.delta.time_seconds),
    ),
    mean_delta_cost_usd: mean(
      modelSummaries.map((summary) => summary.cost.delta_usd),
    ),
    models_improved: modelSummaries.filter(
      (summary) => summary.verdict === "improves",
    ).length,
    models_neutral: modelSummaries.filter((summary) =>
      isNeutralVerdict(summary.verdict),
    ).length,
    models_degraded: modelSummaries.filter(
      (summary) => summary.verdict === "degrades",
    ).length,
  };
}

function currentOverallSnapshot(
  overall: ReturnType<typeof summarizeOverall>,
): BaselineOverallSnapshot {
  return {
    mean_pass_delta: overall.mean_delta_pass_rate,
    mean_token_delta: overall.mean_delta_tokens,
    mean_time_delta_seconds: overall.mean_delta_time_seconds,
    mean_cost_delta_usd: overall.mean_delta_cost_usd,
  };
}

function baselineOverallSnapshot(
  overall: BaselineAggregateReport["overall"],
): BaselineOverallSnapshot {
  return {
    mean_pass_delta: numberOrZero(overall?.mean_delta_pass_rate),
    mean_token_delta: numberOrZero(overall?.mean_delta_tokens),
    mean_time_delta_seconds: numberOrZero(overall?.mean_delta_time_seconds),
    mean_cost_delta_usd: numberOrZero(overall?.mean_delta_cost_usd),
  };
}

function subtractOverallSnapshot(
  current: BaselineOverallSnapshot,
  baseline: BaselineOverallSnapshot,
): BaselineOverallSnapshot {
  return {
    mean_pass_delta: current.mean_pass_delta - baseline.mean_pass_delta,
    mean_token_delta: current.mean_token_delta - baseline.mean_token_delta,
    mean_time_delta_seconds:
      current.mean_time_delta_seconds - baseline.mean_time_delta_seconds,
    mean_cost_delta_usd:
      current.mean_cost_delta_usd - baseline.mean_cost_delta_usd,
  };
}

function currentModelSnapshot(summary: ModelSummary): BaselineModelSnapshot {
  return {
    pass_delta: summary.delta.pass_rate,
    token_delta: summary.delta.tokens,
    time_delta_seconds: summary.delta.time_seconds,
    cost_delta_usd: summary.cost.delta_usd,
  };
}

function baselineModelSnapshot(
  model: BaselineModelReport,
): BaselineModelSnapshot {
  return {
    pass_delta: numberOrZero(model.delta?.pass_rate),
    token_delta: numberOrZero(model.delta?.tokens),
    time_delta_seconds: numberOrZero(model.delta?.time_seconds),
    cost_delta_usd: numberOrZero(model.cost?.delta_usd),
  };
}

function subtractModelSnapshot(
  current: BaselineModelSnapshot,
  baseline: BaselineModelSnapshot,
): BaselineModelSnapshot {
  return {
    pass_delta: current.pass_delta - baseline.pass_delta,
    token_delta: current.token_delta - baseline.token_delta,
    time_delta_seconds:
      current.time_delta_seconds - baseline.time_delta_seconds,
    cost_delta_usd: current.cost_delta_usd - baseline.cost_delta_usd,
  };
}

function summarizeRuns(runs: BenchmarkRun[]): {
  count: number;
  pass_rate: number;
  time_seconds: number;
  tokens: number;
} {
  return {
    count: runs.length,
    pass_rate: mean(runs.map((run) => run.result.pass_rate ?? 0)),
    time_seconds: mean(runs.map((run) => run.result.time_seconds ?? 0)),
    tokens: mean(runs.map((run) => run.result.tokens ?? 0)),
  };
}

function summarizeRunSummaries(
  summaries: Array<ReturnType<typeof summarizeRuns>>,
): {
  count: number;
  pass_rate: number;
  time_seconds: number;
  tokens: number;
} {
  return {
    count: summaries.reduce((sum, summary) => sum + summary.count, 0),
    pass_rate: mean(summaries.map((summary) => summary.pass_rate)),
    time_seconds: mean(summaries.map((summary) => summary.time_seconds)),
    tokens: mean(summaries.map((summary) => summary.tokens)),
  };
}

function modelIdentity(
  modelDir: string,
  benchmark: ModelBenchmark,
): { provider: string; model: string } {
  const metadataModel = normalizedMetadataValue(
    benchmark.metadata.executor_model,
  );
  const metadataProvider = normalizedMetadataValue(
    benchmark.metadata.executor_provider,
  );
  if (metadataModel) {
    return {
      provider: metadataProvider || providerFromModelDir(modelDir),
      model: metadataModel,
    };
  }

  const separatorIndex = modelDir.indexOf("__");
  if (separatorIndex >= 0) {
    return {
      provider: modelDir.slice(0, separatorIndex),
      model: modelDir.slice(separatorIndex + 2),
    };
  }

  return {
    provider: metadataProvider || "unknown",
    model: modelDir,
  };
}

function providerFromModelDir(modelDir: string): string {
  const separatorIndex = modelDir.indexOf("__");
  if (separatorIndex >= 0) return modelDir.slice(0, separatorIndex);
  return "unknown";
}

function normalizedMetadataValue(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  if (
    normalized === "<model-name>" ||
    normalized === "<provider-name>" ||
    normalized === "<model>" ||
    normalized === "<provider>" ||
    normalized === "model-name" ||
    normalized === "provider-name" ||
    normalized === "unknown" ||
    normalized === "n/a"
  ) {
    return undefined;
  }

  if (/^<[^>]+>$/.test(trimmed)) return undefined;

  return trimmed;
}

function inferEvalIds(runs: BenchmarkRun[]): number[] {
  return [...new Set(runs.map((run) => run.eval_id))].sort(
    (left, right) => left - right,
  );
}

function inferRunsPerConfiguration(runs: BenchmarkRun[]): number {
  const counts = new Map<string, number>();
  for (const run of runs) {
    const key = `${run.configuration}:${run.eval_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function classifyDelta(passRateDelta: number, tokenDelta: number): string {
  if (passRateDelta >= 0.15) return "improves";
  if (passRateDelta <= -0.15) return "degrades";
  if (Math.abs(passRateDelta) < 0.05 && tokenDelta > 1500)
    return "costly_neutral";
  return "neutral";
}

function isNeutralVerdict(verdict: string): boolean {
  return verdict === "neutral" || verdict === "costly_neutral";
}

function renderMarkdown(input: {
  generatedAt: string;
  inputRoot: string;
  context: { skill_name: string; suite_name: string };
  modelSummaries: ModelSummary[];
  evalSummaries: ReturnType<typeof summarizeByEval>;
  overall: ReturnType<typeof summarizeOverall>;
  baselineComparison?: BaselineComparison;
}): string {
  const modelRows = input.modelSummaries
    .map(
      (summary) =>
        `| ${summary.model} | ${percent(summary.without_skill.pass_rate)} | ${percent(summary.with_skill.pass_rate)} | ${signedPercent(summary.delta.pass_rate)} | ${signedNumber(summary.delta.tokens, 0)} | ${signedNumber(summary.delta.time_seconds, 1)}s | ${formatUsd(summary.cost.total_usd)} | ${signedUsd(summary.cost.delta_usd)} | ${summary.verdict} |`,
    )
    .join("\n");

  const evalRows = input.evalSummaries
    .map(
      (summary) =>
        `| ${summary.eval_name || `eval-${summary.eval_id}`} | ${percent(summary.without_skill.pass_rate)} | ${percent(summary.with_skill.pass_rate)} | ${signedPercent(summary.delta.pass_rate)} | ${signedNumber(summary.delta.tokens, 0)} | ${signedNumber(summary.delta.time_seconds, 1)}s | ${summary.models
          .map(
            (model) =>
              `${model.model}: ${signedPercent(model.delta.pass_rate)}`,
          )
          .join("<br>")} |`,
    )
    .join("\n");

  const baselineSection = input.baselineComparison
    ? renderBaselineMarkdown(input.baselineComparison)
    : "";

  return `# Skill Benchmark

Generated: ${input.generatedAt}

Skill: ${input.context.skill_name || "unknown"}

Suite: ${input.context.suite_name || "unknown"}

Input: \`${relative(REPO_ROOT, input.inputRoot)}\`

## Overall

- Models: ${input.overall.models}
- Mean pass-rate delta: ${signedPercent(input.overall.mean_delta_pass_rate)}
- Mean token delta: ${signedNumber(input.overall.mean_delta_tokens, 0)}
- Mean time delta: ${signedNumber(input.overall.mean_delta_time_seconds, 1)}s
- Total eval cost: ${formatUsd(input.overall.total_cost_usd)}
- Mean cost delta: ${signedUsd(input.overall.mean_delta_cost_usd)}
- Verdict counts: ${input.overall.models_improved} improves, ${input.overall.models_neutral} neutral, ${input.overall.models_degraded} degrades

${baselineSection}

## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
${modelRows}

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
${evalRows}
`;
}

function renderBaselineMarkdown(comparison: BaselineComparison): string {
  const overallRows = [
    [
      "Mean pass delta",
      signedPercent(comparison.overall.baseline.mean_pass_delta),
      signedPercent(comparison.overall.current.mean_pass_delta),
      signedPercent(comparison.overall.change.mean_pass_delta),
    ],
    [
      "Mean token delta",
      signedNumber(comparison.overall.baseline.mean_token_delta, 0),
      signedNumber(comparison.overall.current.mean_token_delta, 0),
      signedNumber(comparison.overall.change.mean_token_delta, 0),
    ],
    [
      "Mean time delta",
      `${signedNumber(comparison.overall.baseline.mean_time_delta_seconds, 1)}s`,
      `${signedNumber(comparison.overall.current.mean_time_delta_seconds, 1)}s`,
      `${signedNumber(comparison.overall.change.mean_time_delta_seconds, 1)}s`,
    ],
    [
      "Mean cost delta",
      signedUsd(comparison.overall.baseline.mean_cost_delta_usd),
      signedUsd(comparison.overall.current.mean_cost_delta_usd),
      signedUsd(comparison.overall.change.mean_cost_delta_usd),
    ],
  ]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  const modelRows = comparison.models
    .map((model) => {
      if (!model.baseline || !model.change) {
        return `| ${model.model} | New model | n/a | n/a | n/a | ${model.current_verdict} |`;
      }

      return `| ${model.model} | ${signedPercent(model.change.pass_delta)} | ${signedNumber(model.change.token_delta, 0)} | ${signedNumber(model.change.time_delta_seconds, 1)}s | ${signedUsd(model.change.cost_delta_usd)} | ${model.baseline_verdict || "n/a"} -> ${model.current_verdict} |`;
    })
    .join("\n");

  const missingModels =
    comparison.missing_models.length > 0
      ? `\n\nMissing baseline models in this run: ${comparison.missing_models.join(", ")}\n`
      : "";

  return `## Against Baseline

Baseline: \`${comparison.path}\`

Baseline generated: ${comparison.generated_at || "unknown"}

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
${overallRows}

### By Model Against Baseline

| Model | Pass Delta Change | Token Delta Change | Time Delta Change | Cost Delta Change | Verdict |
|-------|-------------------|--------------------|-------------------|-------------------|---------|
${modelRows}${missingModels}`;
}

function mean(values: number[]): number {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
