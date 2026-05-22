/**
 * npm entrypoint:
 *   npm run eval:baseline -- [options]
 *
 * Purpose:
 *   Promotes an existing generated benchmark iteration into a curated baseline
 *   that can be committed under `skills/<skill>/evals/<suite>/baselines/`.
 *   It refreshes the combined aggregate report first, then copies only the
 *   stable summary artifacts instead of raw per-run model outputs.
 */
import { access, copyFile, mkdir, writeFile } from 'fs/promises'
import { spawn } from 'child_process'
import { join, relative } from 'path'
import {
  discoverEvalSuiteDirs,
  EVAL_UTILS_DIRNAME,
  EVAL_WORKSPACES_DIR,
  evalSuitePathParts,
  pathExists,
  readJson,
  resolveRepoPath,
  REPO_ROOT,
  SKILLS_DIR,
} from './utils.js'

interface ModelMatrix {
  default_iteration?: string
}

interface CliOptions {
  inputRoot?: string
  skill?: string
  suite?: string
  iteration?: string
  name?: string
  includeHtml: boolean
  skipAggregate: boolean
  dryRun: boolean
  help: boolean
}

interface BaselineTarget {
  skill: string
  suite: string
  suiteDir: string
  inputRoot: string
  iteration: string
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const targets = options.inputRoot
    ? [await targetFromInputRoot(options.inputRoot)]
    : await resolveTargets(options)

  if (targets.length === 0) {
    throw new Error(`No benchmark outputs matched the selected filters.`)
  }

  for (const target of targets) {
    if (!options.skipAggregate) {
      await refreshAggregate(target, options.dryRun)
    }
    await updateBaseline(target, options)
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    includeHtml: false,
    skipAggregate: false,
    dryRun: false,
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
      case '--input-root':
        options.inputRoot = resolveRepoPath(next())
        break
      case '--skill':
        options.skill = next()
        break
      case '--suite':
        options.suite = next()
        break
      case '--iteration':
        options.iteration = next()
        break
      case '--name':
        options.name = safeBaselineName(next())
        break
      case '--include-html':
        options.includeHtml = true
        break
      case '--skip-aggregate':
        options.skipAggregate = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`Create or update committed eval baselines from generated benchmark output

Usage:
  npm run eval:baseline -- [options]

Options:
  --skill <skill-name>     Filter to one skill, e.g. redis-development.
  --suite <suite-name>     Filter to one eval suite, e.g. data-structures-key-naming.
  --iteration <name>       Source output iteration. Defaults to model-matrix.json default_iteration or iteration-1.
  --input-root <path>      Use one explicit eval-workspaces/<skill>/<suite>/<iteration> directory.
  --name <baseline-name>   Write a named snapshot under baselines/<name>.
                           Default writes the current baseline directly under baselines/.
  --include-html           Also copy aggregate-benchmark.html into the baseline.
  --skip-aggregate         Do not refresh aggregate-benchmark.* before copying.
  --dry-run                Print planned baseline updates without writing files.

Examples:
  npm run eval:baseline -- --skill redis-development --suite data-structures-key-naming
  npm run eval:baseline -- --skill redis-development --suite data-structures-key-naming --name baseline-2026-05-20
`)
}

async function resolveTargets(options: CliOptions): Promise<BaselineTarget[]> {
  const suiteDirs = await discoverEvalSuiteDirs()
  const targets: BaselineTarget[] = []

  for (const suiteDir of suiteDirs) {
    const parts = evalSuitePathParts(suiteDir)
    if (options.skill && parts.skill !== options.skill) continue
    if (options.suite && parts.suite !== options.suite) continue

    const matrix = await readJson<ModelMatrix>(join(suiteDir, 'model-matrix.json'))
    const iteration = options.iteration ?? matrix.default_iteration ?? 'iteration-1'
    const inputRoot = join(EVAL_WORKSPACES_DIR, parts.skill, parts.suite, iteration)

    if (!(await pathExists(inputRoot))) {
      const message = `No output root found at ${relative(REPO_ROOT, inputRoot)}.`
      if (options.skill || options.suite || options.iteration) {
        throw new Error(message)
      }
      console.warn(`Skipping ${relative(REPO_ROOT, suiteDir)}: ${message}`)
      continue
    }

    targets.push({
      skill: parts.skill,
      suite: parts.suite,
      suiteDir,
      inputRoot,
      iteration,
    })
  }

  return targets
}

async function targetFromInputRoot(inputRoot: string): Promise<BaselineTarget> {
  const parts = relative(EVAL_WORKSPACES_DIR, inputRoot).split(/[\\/]/)
  const [skill = '', suite = '', iteration = ''] = parts

  if (!skill || !suite || !iteration || parts.length !== 3) {
    throw new Error(
      `--input-root must point to eval-workspaces/<skill>/<suite>/<iteration>.`
    )
  }

  const suiteDir = join(SKILLS_DIR, skill, 'evals', suite)
  await access(join(suiteDir, 'evals.json'))
  await access(join(suiteDir, 'model-matrix.json'))
  await access(inputRoot)

  return {
    skill,
    suite,
    suiteDir,
    inputRoot,
    iteration,
  }
}

async function refreshAggregate(
  target: BaselineTarget,
  dryRun: boolean
): Promise<void> {
  const inputRootLabel = relative(REPO_ROOT, target.inputRoot)
  if (dryRun) {
    console.log(`[dry-run] Refresh aggregate for ${inputRootLabel}`)
    return
  }

  console.log(`Refreshing aggregate for ${inputRootLabel}`)
  await runCommand(process.execPath, [
    '--import',
    'tsx',
    join(EVAL_UTILS_DIRNAME, 'aggregate.ts'),
    '--input-root',
    target.inputRoot,
  ])
}

async function updateBaseline(
  target: BaselineTarget,
  options: CliOptions
): Promise<void> {
  const baselineDir = baselineDirectory(target, options)
  const includedFiles = [
    'aggregate-benchmark.json',
    'aggregate-benchmark.md',
    'model-matrix.json',
    'baseline.json',
    'README.md',
  ]
  if (options.includeHtml) includedFiles.splice(2, 0, 'aggregate-benchmark.html')

  if (options.dryRun) {
    console.log(
      `[dry-run] Update ${relative(REPO_ROOT, baselineDir)} from ${relative(
        REPO_ROOT,
        target.inputRoot
      )}`
    )
    console.log(`[dry-run] Files: ${includedFiles.join(', ')}`)
    return
  }

  await assertAggregateExists(target.inputRoot, options.includeHtml)
  await mkdir(baselineDir, { recursive: true })

  await copyFile(
    join(target.inputRoot, 'aggregate-benchmark.json'),
    join(baselineDir, 'aggregate-benchmark.json')
  )
  await copyFile(
    join(target.inputRoot, 'aggregate-benchmark.md'),
    join(baselineDir, 'aggregate-benchmark.md')
  )
  if (options.includeHtml) {
    await copyFile(
      join(target.inputRoot, 'aggregate-benchmark.html'),
      join(baselineDir, 'aggregate-benchmark.html')
    )
  }
  await copyFile(
    join(target.suiteDir, 'model-matrix.json'),
    join(baselineDir, 'model-matrix.json')
  )

  const updatedAt = new Date().toISOString()
  await writeFile(
    join(baselineDir, 'baseline.json'),
    `${JSON.stringify(
      {
        baseline_name: options.name ?? 'current',
        updated_at: updatedAt,
        skill_name: target.skill,
        eval_suite: target.suite,
        iteration: target.iteration,
        input_root: relative(REPO_ROOT, target.inputRoot),
        included_files: includedFiles,
      },
      null,
      2
    )}\n`,
    'utf-8'
  )
  await writeFile(
    join(baselineDir, 'README.md'),
    renderBaselineReadme(target, options, updatedAt, includedFiles),
    'utf-8'
  )

  console.log(`Updated ${relative(REPO_ROOT, baselineDir)}`)
}

async function assertAggregateExists(
  inputRoot: string,
  includeHtml: boolean
): Promise<void> {
  await access(join(inputRoot, 'aggregate-benchmark.json'))
  await access(join(inputRoot, 'aggregate-benchmark.md'))
  if (includeHtml) await access(join(inputRoot, 'aggregate-benchmark.html'))
}

function renderBaselineReadme(
  target: BaselineTarget,
  options: CliOptions,
  updatedAt: string,
  includedFiles: string[]
): string {
  return `# ${target.suite} Baseline

Updated: ${updatedAt}

Skill: \`${target.skill}\`

Suite: \`${target.suite}\`

Source iteration: \`${target.iteration}\`

Source output: \`${relative(REPO_ROOT, target.inputRoot)}\`

This is a curated aggregate benchmark snapshot. Use it as the shared reference
when comparing future skill changes against the current accepted behavior.

## Included Files

${includedFiles.map((file) => `- \`${file}\``).join('\n')}

## Update Command

\`\`\`bash
npm run eval:baseline -- --skill ${target.skill} --suite ${target.suite} --iteration ${target.iteration}${options.name ? ` --name ${options.name}` : ''}${options.includeHtml ? ' --include-html' : ''}
\`\`\`
`
}

function baselineDirectory(target: BaselineTarget, options: CliOptions): string {
  const baselinesDir = join(target.suiteDir, 'baselines')
  return options.name ? join(baselinesDir, options.name) : baselinesDir
}

function safeBaselineName(value: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`--name may only contain letters, numbers, dots, dashes, and underscores.`)
  }
  return value
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
