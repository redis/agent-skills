/**
 * Support module, not a direct npm entrypoint.
 *
 * Used by:
 *   npm run eval:aggregate -- [options]
 *   npm run eval -- [options]
 *
 * Purpose:
 *   Renders the standalone Redis-branded HTML aggregate benchmark report from
 *   the normalized cross-model summary built in `aggregate.ts`.
 */
import {
  formatUsd,
  percent,
  signedNumber,
  signedPercent,
  signedUsd,
} from "./utils.js";

type Metric = "pass_rate" | "tokens" | "time_seconds" | "cost_usd";
type DeltaTone = "good" | "bad" | "flat";

interface RunSummary {
  count: number;
  pass_rate: number;
  time_seconds: number;
  tokens: number;
}

interface DeltaSummary {
  pass_rate: number;
  time_seconds: number;
  tokens: number;
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

export interface AggregateModelSummary {
  model_dir: string;
  model: string;
  provider: string;
  analyzer_model: string;
  runs_per_configuration: number;
  evals_run: number[];
  without_skill: RunSummary;
  with_skill: RunSummary;
  delta: DeltaSummary;
  cost: CostSummary;
  verdict: string;
}

export interface AggregateEvalModelSummary {
  model: string;
  eval_name: string;
  with_skill: RunSummary;
  without_skill: RunSummary;
  delta: DeltaSummary;
}

export interface AggregateEvalSummary {
  eval_id: number;
  eval_name: string;
  without_skill: RunSummary;
  with_skill: RunSummary;
  delta: DeltaSummary;
  mean_delta_pass_rate: number;
  models: AggregateEvalModelSummary[];
}

export interface AggregateOverallSummary {
  models: number;
  mean_delta_pass_rate: number;
  mean_delta_tokens: number;
  mean_delta_time_seconds: number;
  total_cost_usd: number;
  generation_cost_usd: number;
  grading_cost_usd: number;
  mean_delta_cost_usd: number;
  models_improved: number;
  models_neutral: number;
  models_degraded: number;
}

export interface BaselineOverallSnapshot {
  mean_pass_delta: number;
  mean_token_delta: number;
  mean_time_delta_seconds: number;
  mean_cost_delta_usd: number;
}

export interface BaselineModelSnapshot {
  pass_delta: number;
  token_delta: number;
  time_delta_seconds: number;
  cost_delta_usd: number;
}

export interface BaselineModelComparison {
  model: string;
  status: "compared" | "new";
  baseline?: BaselineModelSnapshot;
  current: BaselineModelSnapshot;
  change?: BaselineModelSnapshot;
  baseline_verdict?: string;
  current_verdict: string;
}

export interface BaselineComparison {
  path: string;
  generated_at: string;
  input_root: string;
  overall: {
    baseline: BaselineOverallSnapshot;
    current: BaselineOverallSnapshot;
    change: BaselineOverallSnapshot;
  };
  models: BaselineModelComparison[];
  missing_models: string[];
}

export interface AggregateHtmlInput {
  generatedAt: string;
  inputRootLabel: string;
  logoDataUri?: string;
  context: {
    skill_name: string;
    suite_name: string;
  };
  modelSummaries: AggregateModelSummary[];
  evalSummaries: AggregateEvalSummary[];
  overall: AggregateOverallSummary;
  baselineComparison?: BaselineComparison;
}

export function renderAggregateHtml(input: AggregateHtmlInput): string {
  const logo = input.logoDataUri
    ? `<img class="brand-logo" src="${escapeHtml(input.logoDataUri)}" alt="Redis">`
    : "";
  const maxTokenDelta = Math.max(
    1,
    ...input.modelSummaries.map((summary) => Math.abs(summary.delta.tokens)),
  );
  const maxTimeDelta = Math.max(
    1,
    ...input.modelSummaries.map((summary) =>
      Math.abs(summary.delta.time_seconds),
    ),
  );
  const maxCostDelta = Math.max(
    0.0001,
    ...input.modelSummaries.map((summary) => Math.abs(summary.cost.delta_usd)),
  );
  const baselineSection = input.baselineComparison
    ? renderBaselineSection(input.baselineComparison)
    : "";

  const modelRows = input.modelSummaries
    .map((summary) => {
      return `<tr>
        <td><strong>${escapeHtml(summary.model)}</strong></td>
        <td>${comparisonBars(
          summary.without_skill.pass_rate,
          summary.with_skill.pass_rate,
        )}</td>
        <td>${statBadge(signedPercent(summary.delta.pass_rate), summary.delta.pass_rate, "pass_rate")}</td>
        <td>${deltaBar(summary.delta.tokens, maxTokenDelta, 0, "tokens")}</td>
        <td>${deltaBar(summary.delta.time_seconds, maxTimeDelta, 1, "time_seconds", "s")}</td>
        <td><strong>${formatUsd(summary.cost.total_usd)}</strong></td>
        <td>${deltaBar(summary.cost.delta_usd, maxCostDelta, 4, "cost_usd")}</td>
        <td><span class="pill ${escapeHtml(summary.verdict)}">${escapeHtml(summary.verdict)}</span></td>
      </tr>`;
    })
    .join("\n");

  const evalRows = input.evalSummaries
    .map((summary) => {
      const cells = summary.models
        .map(
          (model) =>
            `<td>${statBadge(signedPercent(model.delta.pass_rate), model.delta.pass_rate, "pass_rate")}</td>`,
        )
        .join("\n");
      const evalLabel = summary.eval_name || `eval-${summary.eval_id}`;
      return `<tr>
        <td><strong>${escapeHtml(evalLabel)}</strong></td>
        <td>${comparisonBars(
          summary.without_skill.pass_rate,
          summary.with_skill.pass_rate,
        )}</td>
        <td>${statBadge(signedPercent(summary.delta.pass_rate), summary.delta.pass_rate, "pass_rate")}</td>
        <td>${statBadge(signedNumber(summary.delta.tokens, 0), summary.delta.tokens, "tokens")}</td>
        <td>${statBadge(`${signedNumber(summary.delta.time_seconds, 1)}s`, summary.delta.time_seconds, "time_seconds")}</td>
        ${cells}
      </tr>`;
    })
    .join("\n");

  const evalHeaders = input.modelSummaries
    .map(
      (summary) =>
        `<th>${headerLabel(summary.model, "Pass-rate delta for this eval and model, calculated as with-skill pass rate minus without-skill pass rate.")}</th>`,
    )
    .join("");

  const help = {
    models:
      "Number of model benchmark folders included in this aggregate report.",
    meanPassDelta:
      "Average pass-rate change across models. Calculated as with-skill pass rate minus without-skill pass rate, shown in percentage points.",
    meanTokenDelta:
      "Average token change across models. Positive means higher token cost, usually worse unless quality improves enough to justify it. Negative means token savings.",
    meanTimeDelta:
      "Average runtime change across models. Positive means slower, usually worse unless quality improves enough to justify it. Negative means faster.",
    passRate:
      "Average objective expectation pass rate. The without-skill bar is the neutral baseline; the with-skill bar is green for improvement, red for regression, and gray for no change.",
    passDelta:
      "With-skill pass rate minus without-skill pass rate, shown in percentage points.",
    evalPassRate:
      "Average pass rate for this eval across all included models. The without-skill bar is the baseline; the with-skill bar is green for improvement, red for regression, and gray for no change.",
    meanEvalTokenDelta:
      "Average token change for this eval across all included models. Positive means higher token cost; negative means token savings.",
    meanEvalTimeDelta:
      "Average runtime change for this eval across all included models. Positive means slower; negative means faster.",
    tokenDelta:
      "With-skill average tokens minus without-skill average tokens. Positive means higher token cost, usually worse unless quality improves enough to justify it. Negative means token savings.",
    timeDelta:
      "With-skill average seconds minus without-skill average seconds. Positive means slower, usually worse unless quality improves enough to justify it. Negative means faster.",
    totalCost:
      "Estimated Claude usage cost captured during eval runs. It is read from Claude Code JSON output and is not recomputed by aggregate-only runs.",
    costDelta:
      "With-skill average run cost minus without-skill average run cost. Positive means the skill run was more expensive; negative means cheaper.",
    verdict:
      "Heuristic classification from pass-rate delta and token cost. For example, costly_neutral means little quality gain with a large token increase.",
    eval: "Individual eval case from evals.json.",
    meanEvalPassDelta:
      "Average pass-rate delta for this eval across all included models.",
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Skill Benchmark</title>
  <style>
    :root {
      --bg: #fafaf9;
      --panel: #ffffff;
      --ink: #282828;
      --muted: #6d6e71;
      --line: #d1d3d4;
      --line-soft: #e6e6e6;
      --brand: #dc2626;
      --brand-dark: #b91c1c;
      --focus: #064ea2;
      --good: #15803d;
      --good-soft: #dcfce7;
      --bad: #b91c1c;
      --bad-soft: #fee2e2;
      --base: #6d6e71;
      --tie: #939598;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 32px auto 48px;
    }

    header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 3px solid var(--brand);
    }

    .masthead {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .brand-logo {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 8px;
      box-shadow: 0 0 20px #0000001A;
      flex: 0 0 auto;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0;
    }

    h2 {
      margin: 28px 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }

    .section-context {
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      margin-left: 8px;
    }

    .meta {
      color: var(--muted);
      display: grid;
      gap: 4px;
    }

    .muted {
      color: var(--muted);
    }

    .baseline-meta {
      color: var(--muted);
      display: grid;
      gap: 4px;
      margin: -4px 0 12px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 20px 0 8px;
    }

    .metric {
      position: relative;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 42px 14px 16px;
    }

    .metric-label {
      color: var(--muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .metric > .info {
      position: absolute;
      top: 14px;
      right: 14px;
    }

    .metric strong {
      font-size: 22px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    th, td {
      padding: 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: middle;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .th-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .info {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: var(--panel);
      color: var(--focus);
      cursor: help;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      text-transform: none;
    }

    .tooltip {
      display: none;
    }

    .tooltip-layer {
      position: fixed;
      z-index: 9999;
      width: min(280px, calc(100vw - 48px));
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 100ms ease;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--ink);
      color: #fff;
      padding: 8px 10px;
      box-shadow: 0px 4px 24px 0px #00000029, 0px 0px 0px 1px #00000008;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
      text-align: left;
      text-transform: none;
      white-space: normal;
    }

    .tooltip-layer.visible {
      visibility: visible;
      opacity: 1;
    }

    .tooltip-layer::after {
      content: "";
      position: absolute;
      left: var(--arrow-left, 50%);
      transform: translateX(-50%) rotate(var(--arrow-rotate, 0deg));
      border: 6px solid transparent;
    }

    .tooltip-layer.above::after {
      top: 100%;
      border-top-color: var(--ink);
    }

    .tooltip-layer.below::after {
      bottom: 100%;
      border-bottom-color: var(--ink);
    }

    tr:last-child td { border-bottom: 0; }

    .bar-pair {
      display: grid;
      gap: 6px;
      min-width: 220px;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 88px 1fr 42px;
      gap: 8px;
      align-items: center;
    }

    .track {
      display: block;
      height: 10px;
      background: var(--line-soft);
      border-radius: 999px;
      overflow: hidden;
    }

    .bar {
      display: block;
      height: 100%;
      border-radius: 999px;
    }

    .track.good { background: var(--good-soft); }
    .track.bad { background: var(--bad-soft); }
    .bar.base,
    .bar.flat { background: var(--base); }
    .bar.good { background: var(--good); }
    .bar.bad { background: var(--bad); }

    .delta-track {
      position: relative;
      height: 12px;
      min-width: 160px;
      background: var(--line-soft);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .delta-track::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      background: #a7a9ac;
    }

    .delta-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      border-radius: 999px;
    }

    .delta-text {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }

    .stat {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 8px;
      font-weight: 700;
    }

    .positive,
    .good {
      color: var(--good);
      background: var(--good-soft);
    }

    .negative,
    .bad {
      color: var(--bad);
      background: var(--bad-soft);
    }

    .flat {
      color: var(--muted);
      background: #f3f3f3;
    }

    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      background: #f3f3f3;
      color: var(--muted);
    }

    .pill.improves { background: var(--good-soft); color: var(--good); }
    .pill.degrades { background: var(--bad-soft); color: var(--bad); }
    .pill.costly_neutral { background: var(--bad-soft); color: var(--bad); }

    .legend {
      display: flex;
      gap: 8px 12px;
      color: var(--muted);
      font-size: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .legend-label {
      color: var(--muted);
      font-weight: 700;
    }

    .legend span::before {
      content: "";
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 5px;
      border-radius: 2px;
      vertical-align: -1px;
      background: currentColor;
    }

    .legend-label::before {
      display: none !important;
    }

    .panel {
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="masthead">
        ${logo}
        <h1>Skill Benchmark</h1>
      </div>
      <div class="meta">
        <div>Generated: ${escapeHtml(input.generatedAt)}</div>
        ${input.context.skill_name ? `<div>Skill: <code>${escapeHtml(input.context.skill_name)}</code></div>` : ""}
        ${input.context.suite_name ? `<div>Suite: <code>${escapeHtml(input.context.suite_name)}</code></div>` : ""}
        <div>Input: <code>${escapeHtml(input.inputRootLabel)}</code></div>
      </div>
    </header>

    <section class="summary">
      ${summaryMetric("Models", help.models, `${input.overall.models}`)}
      ${summaryMetric("Mean Pass Delta", help.meanPassDelta, signedPercent(input.overall.mean_delta_pass_rate), deltaClass(input.overall.mean_delta_pass_rate, "pass_rate"))}
      ${summaryMetric("Mean Token Delta", help.meanTokenDelta, signedNumber(input.overall.mean_delta_tokens, 0), deltaClass(input.overall.mean_delta_tokens, "tokens"))}
      ${summaryMetric("Mean Time Delta", help.meanTimeDelta, `${signedNumber(input.overall.mean_delta_time_seconds, 1)}s`, deltaClass(input.overall.mean_delta_time_seconds, "time_seconds"))}
      ${summaryMetric("Total Eval Cost", help.totalCost, formatUsd(input.overall.total_cost_usd))}
      ${summaryMetric("Mean Cost Delta", help.costDelta, signedUsd(input.overall.mean_delta_cost_usd), deltaClass(input.overall.mean_delta_cost_usd, "cost_usd"))}
    </section>

    ${baselineSection}

    <h2>By Model</h2>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>${headerLabel("Model", "Claude model used to generate the evaluated answer.")}</th>
            <th>${headerLabel("Pass Rate", help.passRate)}</th>
            <th>${headerLabel("Pass Delta", help.passDelta)}</th>
            <th>${headerLabel("Token Delta", help.tokenDelta)}</th>
            <th>${headerLabel("Time Delta", help.timeDelta)}</th>
            <th>${headerLabel("Total Cost", help.totalCost)}</th>
            <th>${headerLabel("Cost Delta", help.costDelta)}</th>
            <th>${headerLabel("Verdict", help.verdict)}</th>
          </tr>
        </thead>
        <tbody>
          ${modelRows}
        </tbody>
      </table>
    </div>
    ${renderLegend(input)}

    <h2>By Eval${input.context.skill_name ? `<span class="section-context">${escapeHtml(input.context.skill_name)}</span>` : ""}</h2>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>${headerLabel("Eval", help.eval)}</th>
            <th>${headerLabel("Pass Rate", help.evalPassRate)}</th>
            <th>${headerLabel("Pass Delta", help.meanEvalPassDelta)}</th>
            <th>${headerLabel("Token Delta", help.meanEvalTokenDelta)}</th>
            <th>${headerLabel("Time Delta", help.meanEvalTimeDelta)}</th>
            ${evalHeaders}
          </tr>
        </thead>
        <tbody>
          ${evalRows}
        </tbody>
      </table>
    </div>
  </main>
  <div id="tooltip-layer" class="tooltip-layer" role="tooltip"></div>
  <script>
    (() => {
      const layer = document.getElementById('tooltip-layer');
      const margin = 12;

      function showTooltip(target) {
        const source = target.querySelector('.tooltip');
        if (!source) return;

        layer.textContent = source.textContent;
        layer.className = 'tooltip-layer visible above';
        layer.style.left = '0px';
        layer.style.top = '0px';

        const targetRect = target.getBoundingClientRect();
        const layerRect = layer.getBoundingClientRect();
        const targetCenter = targetRect.left + targetRect.width / 2;
        let left = targetCenter - layerRect.width / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - layerRect.width - margin));

        let top = targetRect.top - layerRect.height - 10;
        let placement = 'above';
        if (top < margin) {
          top = targetRect.bottom + 10;
          placement = 'below';
        }

        const arrowLeft = targetCenter - left;
        layer.className = 'tooltip-layer visible ' + placement;
        layer.style.left = left + 'px';
        layer.style.top = top + 'px';
        layer.style.setProperty('--arrow-left', arrowLeft + 'px');
      }

      function hideTooltip() {
        layer.className = 'tooltip-layer';
      }

      document.querySelectorAll('.info').forEach((info) => {
        info.addEventListener('mouseenter', () => showTooltip(info));
        info.addEventListener('focus', () => showTooltip(info));
        info.addEventListener('mouseleave', hideTooltip);
        info.addEventListener('blur', hideTooltip);
      });

      window.addEventListener('scroll', hideTooltip, { passive: true });
      window.addEventListener('resize', hideTooltip);
    })();
  </script>
</body>
</html>
`;
}

function renderBaselineSection(comparison: BaselineComparison): string {
  const modelRows = comparison.models
    .map((model) => {
      if (!model.baseline || !model.change) {
        return `<tr>
          <td><strong>${escapeHtml(model.model)}</strong></td>
          <td colspan="5"><span class="pill">new model</span></td>
        </tr>`;
      }

      return `<tr>
        <td><strong>${escapeHtml(model.model)}</strong></td>
        <td>${statBadge(signedPercent(model.change.pass_delta), model.change.pass_delta, "pass_rate")}</td>
        <td>${statBadge(signedNumber(model.change.token_delta, 0), model.change.token_delta, "tokens")}</td>
        <td>${statBadge(`${signedNumber(model.change.time_delta_seconds, 1)}s`, model.change.time_delta_seconds, "time_seconds")}</td>
        <td>${statBadge(signedUsd(model.change.cost_delta_usd), model.change.cost_delta_usd, "cost_usd")}</td>
        <td>${escapeHtml(model.baseline_verdict || "n/a")} &rarr; ${escapeHtml(model.current_verdict)}</td>
      </tr>`;
    })
    .join("\n");

  const missingModels =
    comparison.missing_models.length > 0
      ? `<div class="baseline-meta">Missing baseline models in this run: <code>${escapeHtml(comparison.missing_models.join(", "))}</code></div>`
      : "";

  return `<h2>Against Baseline</h2>
    <div class="baseline-meta">
      <div>Baseline: <code>${escapeHtml(comparison.path)}</code></div>
      <div>Baseline generated: ${escapeHtml(comparison.generated_at || "unknown")}</div>
    </div>
    <section class="summary">
      ${summaryMetric("Pass Delta Change", "Current mean pass delta minus baseline mean pass delta. Positive means this run improved the skill uplift versus the baseline.", signedPercent(comparison.overall.change.mean_pass_delta), deltaClass(comparison.overall.change.mean_pass_delta, "pass_rate"))}
      ${summaryMetric("Token Delta Change", "Current mean token delta minus baseline mean token delta. Negative means this run reduced token overhead versus the baseline.", signedNumber(comparison.overall.change.mean_token_delta, 0), deltaClass(comparison.overall.change.mean_token_delta, "tokens"))}
      ${summaryMetric("Time Delta Change", "Current mean time delta minus baseline mean time delta. Negative means this run reduced runtime overhead versus the baseline.", `${signedNumber(comparison.overall.change.mean_time_delta_seconds, 1)}s`, deltaClass(comparison.overall.change.mean_time_delta_seconds, "time_seconds"))}
      ${summaryMetric("Cost Delta Change", "Current mean cost delta minus baseline mean cost delta. Negative means the with-skill cost overhead improved versus the baseline.", signedUsd(comparison.overall.change.mean_cost_delta_usd), deltaClass(comparison.overall.change.mean_cost_delta_usd, "cost_usd"))}
    </section>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>${headerLabel("Model", "Model included in both the current run and baseline when possible.")}</th>
            <th>${headerLabel("Pass Delta Change", "Current model pass delta minus baseline model pass delta.")}</th>
            <th>${headerLabel("Token Delta Change", "Current model token delta minus baseline model token delta. Negative is better.")}</th>
            <th>${headerLabel("Time Delta Change", "Current model time delta minus baseline model time delta. Negative is better.")}</th>
            <th>${headerLabel("Cost Delta Change", "Current model cost delta minus baseline model cost delta. Negative is better.")}</th>
            <th>${headerLabel("Verdict", "Baseline verdict followed by current verdict.")}</th>
          </tr>
        </thead>
        <tbody>
          ${modelRows}
        </tbody>
      </table>
    </div>
    ${missingModels}`;
}

function renderLegend(input: AggregateHtmlInput): string {
  const tones = new Set<DeltaTone>();
  const addTone = (value: number, metric: Metric) =>
    tones.add(deltaTone(value, metric));

  for (const summary of input.modelSummaries) {
    addTone(summary.delta.pass_rate, "pass_rate");
    addTone(summary.delta.tokens, "tokens");
    addTone(summary.delta.time_seconds, "time_seconds");
    addTone(summary.cost.delta_usd, "cost_usd");
  }

  for (const summary of input.evalSummaries) {
    addTone(summary.delta.pass_rate, "pass_rate");
    addTone(summary.delta.tokens, "tokens");
    addTone(summary.delta.time_seconds, "time_seconds");
    for (const model of summary.models) {
      addTone(model.delta.pass_rate, "pass_rate");
    }
  }

  const baseline = input.baselineComparison;
  if (baseline) {
    addTone(baseline.overall.change.mean_pass_delta, "pass_rate");
    addTone(baseline.overall.change.mean_token_delta, "tokens");
    addTone(baseline.overall.change.mean_time_delta_seconds, "time_seconds");
    addTone(baseline.overall.change.mean_cost_delta_usd, "cost_usd");
    for (const model of baseline.models) {
      if (!model.change) continue;
      addTone(model.change.pass_delta, "pass_rate");
      addTone(model.change.token_delta, "tokens");
      addTone(model.change.time_delta_seconds, "time_seconds");
      addTone(model.change.cost_delta_usd, "cost_usd");
    }
  }

  const toneItems: Array<{ tone: DeltaTone; label: string; color: string }> = [
    { tone: "flat", label: "Neutral", color: "var(--tie)" },
    { tone: "good", label: "Good", color: "var(--good)" },
    { tone: "bad", label: "Bad", color: "var(--bad)" },
  ];

  const renderedToneItems = toneItems
    .filter((item) => tones.has(item.tone))
    .map(
      (item) =>
        `<span style="color: ${item.color}">${escapeHtml(item.label)}</span>`,
    )
    .join("\n      ");

  return `<div class="legend">
      <span class="legend-label">Judgment colors:</span>
      ${renderedToneItems}
    </div>`;
}

function summaryMetric(
  label: string,
  tooltip: string,
  value: string,
  valueClass = "",
): string {
  return `<div class="metric">
    ${infoIcon(tooltip)}
    <span class="metric-label">${escapeHtml(label)}</span>
    <strong class="${valueClass}">${escapeHtml(value)}</strong>
  </div>`;
}

function headerLabel(label: string, tooltip: string): string {
  return `<span class="th-label">${escapeHtml(label)}${infoIcon(tooltip)}</span>`;
}

function infoIcon(tooltip: string): string {
  return `<span class="info" tabindex="0" aria-label="${escapeHtml(tooltip)}">i<span class="tooltip" role="tooltip">${escapeHtml(tooltip)}</span></span>`;
}

function statBadge(label: string, value: number, metric: Metric): string {
  return `<span class="${deltaClass(value, metric)}">${escapeHtml(label)}</span>`;
}

function comparisonBars(withoutSkill: number, withSkill: number): string {
  const withSkillTone = deltaTone(withSkill - withoutSkill, "pass_rate");
  return `<div class="bar-pair">
    ${barRow("Without", withoutSkill, "base")}
    ${barRow("With", withSkill, withSkillTone)}
  </div>`;
}

function barRow(label: string, value: number, className: string): string {
  return `<div class="bar-row">
    <span>${escapeHtml(label)}</span>
    <span class="track ${className}"><span class="bar ${className}" style="width: ${clamp(value * 100, 0, 100).toFixed(1)}%"></span></span>
    <strong>${percent(value)}</strong>
  </div>`;
}

function deltaBar(
  value: number,
  maxAbs: number,
  decimals: number,
  metric: "tokens" | "time_seconds" | "cost_usd",
  unit = "",
): string {
  const width = clamp((Math.abs(value) / maxAbs) * 50, 0, 50);
  const color = deltaColor(value, metric);
  const left = value >= 0 ? 50 : 50 - width;
  const label =
    metric === "cost_usd"
      ? signedUsd(value)
      : `${signedNumber(value, decimals)}${escapeHtml(unit)}`;
  return `<span class="delta-track">
    <span class="delta-fill" style="left: ${left.toFixed(1)}%; width: ${width.toFixed(1)}%; background: ${color};"></span>
  </span>
  <span class="delta-text"><span class="${deltaClass(value, metric)}">${label}</span></span>`;
}

function deltaClass(value: number, metric: Metric): string {
  return `stat ${deltaTone(value, metric)}`;
}

function deltaTone(value: number, metric: Metric): DeltaTone {
  if (metric === "pass_rate") {
    if (value > 0.001) return "good";
    if (value < -0.001) return "bad";
    return "flat";
  }

  const epsilon = metric === "cost_usd" ? 0.000001 : 0.001;
  if (value < -epsilon) return "good";
  if (value <= epsilon) return "flat";
  return "bad";
}

function deltaColor(
  value: number,
  metric: "tokens" | "time_seconds" | "cost_usd",
): string {
  const tone = deltaTone(value, metric);
  if (tone === "good") return "var(--good)";
  if (tone === "bad") return "var(--bad)";
  return "var(--tie)";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
