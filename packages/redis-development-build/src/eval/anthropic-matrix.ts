/**
 * npm entrypoint:
 *   npm run eval -- [options]
 *
 * Purpose:
 *   Runs one or more Agent Skills eval suites across the configured Claude
 *   model matrix. For each eval it generates both `without_skill` and
 *   `with_skill` outputs, grades them with the configured judge model, keeps
 *   Anthropic skill-creator-compatible run artifacts, runs the per-model
 *   Anthropic benchmark aggregation, and then triggers this repo's combined
 *   cross-model aggregate report.
 */
import { access, mkdir, writeFile } from 'fs/promises'
import { accessSync } from 'fs'
import { spawn } from 'child_process'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import {
  assertEvalSuiteDir,
  discoverEvalSuiteDirs,
  EVAL_WORKSPACES_DIR,
  evalSuitePathParts,
  isNodeError,
  numberOrZero,
  readJson,
  REPO_ROOT,
  SKILLS_DIR,
  sumModelUsageCost,
} from './utils.js'

type Configuration = 'with_skill' | 'without_skill'

interface EvalCase {
  id: number
  name?: string
  prompt: string
  expected_output: string
  expectations?: string[]
  covered_rules?: string[]
}

interface EvalSuite {
  skill_name: string
  eval_suite: string
  description?: string
  evals: EvalCase[]
}

interface ModelMatrix {
  eval_suite?: string
  description?: string
  models: string[]
  configurations?: Configuration[]
  repetitions?: number
  default_iteration?: string
  judge_model?: string
}

interface CliOptions {
  skill?: string
  suite?: string
  iteration?: string
  skillCreatorPath?: string
  claudeBin: string
  pythonBin: string
  concurrency: number
  dryRun: boolean
  force: boolean
  smoke: boolean
  skipCombined: boolean
  help: boolean
  repetitions?: number
  onlyModel?: string
  onlyEval?: string
  judgeModel?: string
}

interface CommandResult {
  stdout: string
  stderr: string
  durationMs: number
}

interface CommandUsageSummary {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  total_tokens: number
  total_cost_usd?: number
  model_usage?: unknown
}

interface EvalRunTask {
  suite: EvalSuite
  evalCase: EvalCase
  model: string
  configuration: Configuration
  repetition: number
  runDir: string
  outputPath: string
  skillPath: string
  judgeModel: string
}

const DEFAULT_CONCURRENCY = 3

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const suiteDirs = await resolveSuiteDirs(options)
  if (suiteDirs.length === 0) {
    throw new Error(`No eval suites matched the selected filters.`)
  }

  const skillCreatorPath = resolveSkillCreatorPath(options, !options.dryRun)
  if (!options.dryRun) {
    await assertSkillCreatorPath(skillCreatorPath)
  }

  for (let index = 0; index < suiteDirs.length; index++) {
    const suiteDir = suiteDirs[index]
    if (suiteDirs.length > 1) {
      console.log(
        `\n=== Eval suite ${index + 1}/${suiteDirs.length}: ${relative(
          REPO_ROOT,
          suiteDir
        )} ===`
      )
    }

    await runSuite(suiteDir, skillCreatorPath, options)
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    claudeBin: process.env.CLAUDE_BIN || 'claude',
    pythonBin: process.env.PYTHON_BIN || 'python3',
    concurrency: parsePositiveInteger(process.env.EVAL_CONCURRENCY) ?? DEFAULT_CONCURRENCY,
    dryRun: false,
    force: false,
    smoke: false,
    skipCombined: false,
    help: false,
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const next = () => {
      const value = args[++index]
      if (!value) throw new Error(`Missing value for ${arg}`)
      return value
    }

    switch (arg) {
      case '--skill':
        options.skill = next()
        break
      case '--suite':
        options.suite = next()
        break
      case '--iteration':
        options.iteration = next()
        break
      case '--skill-creator-path':
        options.skillCreatorPath = next()
        break
      case '--claude-bin':
        options.claudeBin = next()
        break
      case '--python-bin':
        options.pythonBin = next()
        break
      case '--concurrency':
        options.concurrency = Number.parseInt(next(), 10)
        break
      case '--repetitions':
        options.repetitions = Number.parseInt(next(), 10)
        break
      case '--only-model':
        options.onlyModel = next()
        break
      case '--only-eval':
        options.onlyEval = next()
        break
      case '--judge-model':
        options.judgeModel = next()
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--force':
        options.force = true
        break
      case '--smoke':
        options.smoke = true
        break
      case '--skip-combined':
        options.skipCombined = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (
    options.repetitions !== undefined &&
    (!Number.isInteger(options.repetitions) || options.repetitions < 1)
  ) {
    throw new Error(`--repetitions must be a positive integer.`)
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer.`)
  }

  return options
}

function printHelp(): void {
  console.log(`Run Agent Skills evals through Claude Code and Anthropic skill-creator artifacts

Usage:
  npm run eval -- [options]

Options:
  --skill <skill-name>          Filter to one skill, e.g. redis-development.
  --suite <suite-or-path>       Filter to one eval suite name, or pass a suite directory path.
  --skill-creator-path <path>   Path to skill-creator. Optional when the official Claude
                                skill-creator plugin is installed or cached locally.
                                Can also be set with ANTHROPIC_SKILL_CREATOR_PATH.
  --iteration <name>            Output iteration name. Defaults to model-matrix.json default_iteration or iteration-1.
  --smoke                       Run one repetition instead of configured repetitions.
  --repetitions <number>        Override repetitions.
  --only-model <model>          Filter to one exact model ID.
  --only-eval <eval-id-or-name> Filter to one eval ID or name.
  --judge-model <model>         Model used for expectation grading. Defaults to model-matrix.json judge_model or claude-opus-4-7.
  --concurrency <number>        Max parallel eval runs. Default: ${DEFAULT_CONCURRENCY}, or EVAL_CONCURRENCY.
  --force                       Overwrite existing selected output files.
  --dry-run                     Print the run matrix without invoking Claude.
  --skip-combined               Skip this repo's cross-model aggregate report.
  --claude-bin <path>           Claude Code binary. Default: claude.
  --python-bin <path>           Python binary for Anthropic scripts. Default: python3.

Examples:
  claude plugin install skill-creator@claude-plugins-official
  npm run eval -- --skill redis-development --suite data-structures-key-naming --smoke
`)
}

async function runSuite(
  suiteDir: string,
  skillCreatorPath: string,
  options: CliOptions
): Promise<void> {
  const suite = await readJson<EvalSuite>(join(suiteDir, 'evals.json'))
  const matrix = await readJson<ModelMatrix>(join(suiteDir, 'model-matrix.json'))
  validateSuite(suite)
  validateMatrix(matrix)
  if (matrix.eval_suite && matrix.eval_suite !== suite.eval_suite) {
    throw new Error(
      `model-matrix.json eval_suite (${matrix.eval_suite}) must match evals.json eval_suite (${suite.eval_suite}).`
    )
  }

  const iteration = options.iteration ?? matrix.default_iteration ?? 'iteration-1'
  const repetitions = options.repetitions ?? (options.smoke ? 1 : matrix.repetitions ?? 1)
  const configurations = matrix.configurations ?? ['with_skill', 'without_skill']
  const judgeModel = options.judgeModel ?? matrix.judge_model ?? 'claude-opus-4-7'
  const evals = suite.evals.filter(
    (evalCase) =>
      !options.onlyEval ||
      evalCase.name === options.onlyEval ||
      String(evalCase.id) === options.onlyEval
  )
  const models = matrix.models.filter(
    (model) => !options.onlyModel || model === options.onlyModel
  )

  if (evals.length === 0) throw new Error(`No evals matched the selected filters.`)
  if (models.length === 0) throw new Error(`No models matched the selected filters.`)

  const skillPath = join(SKILLS_DIR, suite.skill_name)
  const outputRoot = join(
    EVAL_WORKSPACES_DIR,
    suite.skill_name,
    suite.eval_suite,
    iteration
  )

  printRunSummary({
    suite,
    evals,
    models,
    configurations,
    repetitions,
    judgeModel,
    outputRoot,
    options,
  })

  if (options.dryRun) return

  const tasks: EvalRunTask[] = []
  for (const model of models) {
    const modelWorkspace = join(outputRoot, `anthropic__${model}`)
    for (const evalCase of evals) {
      const evalDir = join(modelWorkspace, evalDirName(evalCase))
      await writeEvalMetadata(evalDir, evalCase)

      for (const configuration of configurations) {
        for (let repetition = 1; repetition <= repetitions; repetition++) {
          const runDir = join(evalDir, configuration, `run-${repetition}`)
          const outputPath = join(runDir, 'outputs/output.md')
          await assertWritableOutput(outputPath, options.force)
          tasks.push({
            suite,
            evalCase,
            model,
            configuration,
            repetition,
            runDir,
            outputPath,
            skillPath,
            judgeModel,
          })
        }
      }
    }
  }

  let completedTasks = 0
  await runWithConcurrency(tasks, options.concurrency, async (task) => {
    await runEvalTask(task, options)
    completedTasks += 1
    logProgress(
      `[done ${completedTasks}/${tasks.length}] ${task.suite.eval_suite} ${task.model} eval-${task.evalCase.id} ${task.configuration} run-${task.repetition}`
    )
  })

  await runWithConcurrency(models, Math.min(options.concurrency, models.length), async (model) => {
    await runAnthropicAggregate({
      pythonBin: options.pythonBin,
      skillCreatorPath,
      modelWorkspace: join(outputRoot, `anthropic__${model}`),
      skillName: suite.skill_name,
      skillPath,
    })
  })

  if (!options.skipCombined) {
    await runCombinedAggregate(outputRoot)
  }
}

async function runEvalTask(
  task: EvalRunTask,
  options: Pick<CliOptions, 'claudeBin'>
): Promise<void> {
  await mkdir(dirname(task.outputPath), { recursive: true })

  logProgress(
    `[generate] ${task.suite.eval_suite} ${task.model} eval-${task.evalCase.id} ${task.configuration} run-${task.repetition}`
  )
  const generation = await runClaude({
    claudeBin: options.claudeBin,
    model: task.model,
    prompt: buildGenerationPrompt({
      evalCase: task.evalCase,
      configuration: task.configuration,
      skillPath: task.skillPath,
    }),
    cwd: task.runDir,
    disableSkills: task.configuration === 'without_skill',
    addDirs: task.configuration === 'with_skill' ? [task.skillPath] : [],
  })
  const output = extractClaudeText(generation.stdout)
  await writeFile(task.outputPath, `${output.trim()}\n`, 'utf-8')
  await writeTiming(join(task.runDir, 'timing.json'), generation, task.model)

  logProgress(
    `[grade] ${task.suite.eval_suite} ${task.model} eval-${task.evalCase.id} ${task.configuration} run-${task.repetition}`
  )
  const grading = await gradeOutput({
    claudeBin: options.claudeBin,
    judgeModel: task.judgeModel,
    evalCase: task.evalCase,
    output,
    generation,
  })
  await writeJson(join(task.runDir, 'grading.json'), grading)
}

async function resolveSuiteDirs(options: CliOptions): Promise<string[]> {
  if (options.suite && looksLikePath(options.suite)) {
    const suiteDir = isAbsolute(options.suite)
      ? options.suite
      : resolve(REPO_ROOT, options.suite)
    await assertEvalSuiteDir(suiteDir)
    return [suiteDir]
  }

  const suiteDirs = await discoverEvalSuiteDirs()
  return suiteDirs.filter((suiteDir) => {
    const parts = evalSuitePathParts(suiteDir)
    if (options.skill && parts.skill !== options.skill) return false
    if (options.suite && parts.suite !== options.suite) return false
    return true
  })
}

function resolveSkillCreatorPath(options: CliOptions, required: boolean): string {
  const configured = options.skillCreatorPath ?? process.env.ANTHROPIC_SKILL_CREATOR_PATH
  if (configured) return isAbsolute(configured) ? configured : resolve(REPO_ROOT, configured)

  const detected = detectSkillCreatorPath()
  if (detected) return detected

  if (!required) return ''
  throw new Error(
    `Could not find Anthropic skill-creator scripts. Install the official plugin with "claude plugin install skill-creator@claude-plugins-official", or pass --skill-creator-path /path/to/skill-creator.`
  )
}

async function assertSkillCreatorPath(skillCreatorPath: string): Promise<void> {
  await access(join(skillCreatorPath, 'scripts/aggregate_benchmark.py'))
}

function detectSkillCreatorPath(): string | null {
  const home = process.env.HOME
  if (!home) return null

  const candidates = [
    join(
      home,
      '.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator'
    ),
  ]

  for (const candidate of candidates) {
    try {
      requireAccess(candidate)
      return candidate
    } catch {
      continue
    }
  }

  return null
}

function requireAccess(path: string): void {
  const aggregateScript = join(path, 'scripts/aggregate_benchmark.py')
  accessSync(aggregateScript)
}

function buildGenerationPrompt(input: {
  evalCase: EvalCase
  configuration: Configuration
  skillPath: string
}): string {
  const skillInstruction =
    input.configuration === 'with_skill'
      ? `Use the skill at this path if it is relevant:\n${input.skillPath}`
      : `Do not use any skill. Answer from the base model context only. Do not read or rely on ${input.skillPath}.`

  return `Execute this Agent Skills eval run.

${skillInstruction}

Task:
${input.evalCase.prompt}

Return only the final answer for the user.`
}

async function gradeOutput(input: {
  claudeBin: string
  judgeModel: string
  evalCase: EvalCase
  output: string
  generation: CommandResult
}): Promise<unknown> {
  const expectations = evalExpectations(input.evalCase)
  const grading = await runClaude({
    claudeBin: input.claudeBin,
    model: input.judgeModel,
    cwd: EVAL_WORKSPACES_DIR,
    disableSkills: true,
    addDirs: [],
    prompt: `You are grading an Agent Skills eval output.

Prompt:
${input.evalCase.prompt}

Expected output:
${input.evalCase.expected_output}

Expectations:
${expectations.map((expectation, index) => `${index + 1}. ${expectation}`).join('\n')}

Candidate output:
${input.output}

Return JSON only, with this exact shape:
{
  "expectations": [
    { "text": "<expectation text>", "passed": true, "evidence": "<specific evidence>" }
  ]
}`,
  })

  const parsed = parseJsonObject(extractClaudeText(grading.stdout))
  const rawResults = Array.isArray(parsed.expectations) ? parsed.expectations : []
  const expectationResults = expectations.map((expectation, index) => {
    const raw =
      rawResults.find((candidate: any) => candidate.text === expectation) ??
      rawResults[index]
    return {
      text: expectation,
      passed: Boolean(raw?.passed),
      evidence:
        typeof raw?.evidence === 'string' && raw.evidence.trim()
          ? raw.evidence
          : 'No evidence provided by judge.',
    }
  })
  const passed = expectationResults.filter((result) => result.passed).length
  const total = expectationResults.length
  const usage = commandUsageSummary(grading.stdout)

  return {
    expectations: expectationResults,
    summary: {
      passed,
      failed: total - passed,
      total,
      pass_rate: total === 0 ? 0 : passed / total,
    },
    usage,
    cost: {
      total_usd: usage.total_cost_usd ?? 0,
      source: 'claude_cli_total_cost_usd',
    },
    execution_metrics: {
      tool_calls: {},
      total_tool_calls: 0,
      total_steps: 1,
      errors_encountered: 0,
      output_chars: input.output.length,
      transcript_chars: input.generation.stdout.length + input.generation.stderr.length,
    },
    timing: {
      total_duration_seconds: seconds(input.generation.durationMs),
    },
    user_notes_summary: {
      uncertainties: [],
      needs_review: [],
      workarounds: [],
    },
  }
}

async function runAnthropicAggregate(input: {
  pythonBin: string
  skillCreatorPath: string
  modelWorkspace: string
  skillName: string
  skillPath: string
}): Promise<void> {
  logProgress(`[benchmark] ${relative(REPO_ROOT, input.modelWorkspace)}`)
  await runCommand(input.pythonBin, [
    '-m',
    'scripts.aggregate_benchmark',
    input.modelWorkspace,
    '--skill-name',
    input.skillName,
    '--skill-path',
    input.skillPath,
  ], {
    cwd: input.skillCreatorPath,
  })
}

async function runCombinedAggregate(outputRoot: string): Promise<void> {
  logProgress(`[aggregate] ${relative(REPO_ROOT, outputRoot)}`)
  await runCommand('npx', ['tsx', 'src/eval/aggregate.ts', '--input-root', outputRoot], {
    cwd: join(REPO_ROOT, 'packages/redis-development-build'),
  })
}

async function runClaude(input: {
  claudeBin: string
  model: string
  prompt: string
  cwd: string
  disableSkills: boolean
  addDirs: string[]
}): Promise<CommandResult> {
  const args = [
    '-p',
    input.prompt,
    '--model',
    input.model,
    '--output-format',
    'json',
    '--no-session-persistence',
  ]
  for (const dir of input.addDirs) {
    args.push('--add-dir', dir)
  }
  if (input.disableSkills) args.push('--disable-slash-commands')

  return runCommand(input.claudeBin, args, { cwd: input.cwd })
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd: string }
): Promise<CommandResult> {
  const startedAt = Date.now()
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.on('error', reject)
    child.on('close', (code) => {
      const result = {
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        durationMs: Date.now() - startedAt,
      }
      if (code === 0) {
        resolvePromise(result)
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${code}\n${result.stderr}`
          )
        )
      }
    })
  })
}

async function assertWritableOutput(outputPath: string, force: boolean): Promise<void> {
  if (force) return
  try {
    await access(outputPath)
    throw new Error(
      `${relative(REPO_ROOT, outputPath)} already exists. Use --force to overwrite selected runs.`
    )
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return
    throw error
  }
}

async function writeEvalMetadata(evalDir: string, evalCase: EvalCase): Promise<void> {
  await writeJson(join(evalDir, 'eval_metadata.json'), {
    eval_id: evalCase.id,
    eval_name: evalName(evalCase),
    prompt: evalCase.prompt,
    expected_output: evalCase.expected_output,
    expectations: evalExpectations(evalCase),
    covered_rules: evalCase.covered_rules ?? [],
  })
}

async function writeTiming(
  filePath: string,
  result: CommandResult,
  model: string
): Promise<void> {
  const parsed = tryParseJson(result.stdout)
  const usage = commandUsageSummary(result.stdout)
  await writeJson(filePath, {
    model,
    duration_ms: result.durationMs,
    total_duration_seconds: seconds(result.durationMs),
    total_tokens: usage.total_tokens,
    usage,
    cost: {
      total_usd: usage.total_cost_usd ?? 0,
      source: 'claude_cli_total_cost_usd',
    },
    raw_result: parsed ?? undefined,
  })
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
}

function validateSuite(suite: EvalSuite): void {
  if (!suite.skill_name) throw new Error(`evals.json must include skill_name.`)
  if (!suite.eval_suite) throw new Error(`evals.json must include eval_suite.`)
  if (!Array.isArray(suite.evals) || suite.evals.length === 0) {
    throw new Error(`evals.json must include at least one eval.`)
  }
  for (const evalCase of suite.evals) {
    if (!Number.isInteger(evalCase.id)) {
      throw new Error(`Each eval must include an integer id.`)
    }
    if (!evalCase.prompt) {
      throw new Error(`eval-${evalCase.id} must include prompt.`)
    }
    if (!evalCase.expected_output) {
      throw new Error(`eval-${evalCase.id} must include expected_output.`)
    }
    if (!Array.isArray(evalCase.expectations) || evalCase.expectations.length === 0) {
      throw new Error(`eval-${evalCase.id} must include at least one expectation.`)
    }
  }
}

function validateMatrix(matrix: ModelMatrix): void {
  if (!Array.isArray(matrix.models) || matrix.models.length === 0) {
    throw new Error(`model-matrix.json must include models.`)
  }
  if (
    matrix.configurations &&
    matrix.configurations.some(
      (configuration) =>
        configuration !== 'with_skill' && configuration !== 'without_skill'
    )
  ) {
    throw new Error(
      `model-matrix.json configurations must be with_skill or without_skill.`
    )
  }
}

function printRunSummary(input: {
  suite: EvalSuite
  evals: EvalCase[]
  models: string[]
  configurations: Configuration[]
  repetitions: number
  judgeModel: string
  outputRoot: string
  options: CliOptions
}): void {
  const totalGenerations =
    input.evals.length *
    input.models.length *
    input.configurations.length *
    input.repetitions

  console.log(`Eval suite: ${input.suite.skill_name}/${input.suite.eval_suite}`)
  console.log(`Output: ${relative(REPO_ROOT, input.outputRoot)}`)
  console.log(
    `Evals: ${input.evals
      .map((evalCase) => `eval-${evalCase.id}:${evalName(evalCase)}`)
      .join(', ')}`
  )
  console.log(`Models: ${input.models.join(', ')}`)
  console.log(`Configurations: ${input.configurations.join(', ')}`)
  console.log(`Repetitions: ${input.repetitions}`)
  console.log(`Generations: ${totalGenerations}`)
  console.log(`Judge model: ${input.judgeModel}`)
  console.log(`Concurrency: ${input.options.concurrency}`)
  if (input.options.dryRun) console.log(`Dry run only; no commands will run.`)
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return

  let nextIndex = 0
  let stopped = false
  const errors: unknown[] = []
  const workerCount = Math.min(concurrency, items.length)
  const workers = Array.from({ length: workerCount }, async () => {
    while (!stopped && nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      try {
        await worker(items[currentIndex], currentIndex)
      } catch (error) {
        errors.push(error)
        stopped = true
      }
    }
  })

  await Promise.all(workers)
  if (errors.length > 0) {
    throw errors[0]
  }
}

function extractClaudeText(stdout: string): string {
  const parsed = tryParseJson(stdout)
  if (parsed && typeof parsed.result === 'string') return parsed.result
  if (parsed && typeof parsed.content === 'string') return parsed.content
  return stdout
}

function parseJsonObject(text: string): any {
  const parsed = tryParseJson(text)
  if (parsed) return parsed
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Could not parse JSON from grader output.`)
  return JSON.parse(match[0])
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function evalExpectations(evalCase: EvalCase): string[] {
  return evalCase.expectations ?? []
}

function evalDirName(evalCase: EvalCase): string {
  return `eval-${evalCase.id}`
}

function evalName(evalCase: EvalCase): string {
  return evalCase.name ?? `eval-${evalCase.id}`
}

function looksLikePath(value: string): boolean {
  return (
    isAbsolute(value) ||
    value.startsWith('.') ||
    value.includes('/') ||
    value.includes('\\')
  )
}

function seconds(durationMs: number): number {
  return Number((durationMs / 1000).toFixed(3))
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function commandUsageSummary(stdout: string): CommandUsageSummary {
  const parsed = tryParseJson(stdout)
  const usage = parsed?.usage
  const modelUsage = parsed?.modelUsage
  const modelUsageCost = sumModelUsageCost(modelUsage)
  const inputTokens = numberOrZero(usage?.input_tokens)
  const outputTokens = numberOrZero(usage?.output_tokens)
  const cacheCreationInputTokens = numberOrZero(usage?.cache_creation_input_tokens)
  const cacheReadInputTokens = numberOrZero(usage?.cache_read_input_tokens)
  const totalTokens =
    inputTokens +
    outputTokens +
    cacheCreationInputTokens +
    cacheReadInputTokens

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheCreationInputTokens,
    cache_read_input_tokens: cacheReadInputTokens,
    total_tokens: totalTokens || sumModelUsageTokens(modelUsage),
    total_cost_usd:
      numberOrUndefined(parsed?.total_cost_usd) ??
      (modelUsageCost > 0 ? modelUsageCost : undefined),
    model_usage: modelUsage,
  }
}

function sumModelUsageTokens(modelUsage: unknown): number {
  if (!modelUsage || typeof modelUsage !== 'object') return 0
  return Object.values(modelUsage).reduce((sum, usage) => {
    if (!usage || typeof usage !== 'object') return sum
    const usageRecord = usage as Record<string, unknown>
    return (
      sum +
      numberOrZero(usageRecord.inputTokens) +
      numberOrZero(usageRecord.outputTokens) +
      numberOrZero(usageRecord.cacheReadInputTokens) +
      numberOrZero(usageRecord.cacheCreationInputTokens)
    )
  }, 0)
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function logProgress(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 19)
  console.log(colorizeProgress(`[${timestamp}] ${message}`))
}

function colorizeProgress(line: string): string {
  if (!shouldColorize()) return line

  if (line.includes('[done ')) return color(line, 'green')
  if (line.includes('[generate]')) return color(line, 'cyan')
  if (line.includes('[grade]')) return color(line, 'magenta')
  if (line.includes('[benchmark]')) return color(line, 'yellow')
  if (line.includes('[aggregate]')) return color(line, 'blue')
  return line
}

function shouldColorize(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
}

function color(text: string, colorName: 'green' | 'cyan' | 'magenta' | 'yellow' | 'blue'): string {
  const codes = {
    green: 32,
    cyan: 36,
    magenta: 35,
    yellow: 33,
    blue: 34,
  }
  return `\u001b[${codes[colorName]}m${text}\u001b[0m`
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
