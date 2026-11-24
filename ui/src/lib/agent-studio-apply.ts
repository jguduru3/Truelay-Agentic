import {
  AGENT_STUDIO_RULE_SECTIONS,
  applyAgentStudioRules,
  type AgentStudioProposal,
  type AgentStudioRules,
  type AgentStudioScheduleChange,
} from "@paperclipai/shared";

/** The agent's instructions entry file as last read, needed to save safely. */
export interface AgentStudioEntryFile {
  path: string;
  content: string;
  contentHash?: string;
  revisionId?: string | null;
}

export interface AgentStudioApplyDeps {
  saveInstructions: (input: {
    path: string;
    content: string;
    baseHash: string | null;
    baseRevisionId: string | null;
  }) => Promise<unknown>;
  createRoutine: (input: { title: string; description: string; assigneeAgentId: string; status: "active" }) => Promise<{ id: string }>;
  createScheduleTrigger: (routineId: string, input: { kind: "schedule"; cronExpression: string; timezone: string }) => Promise<unknown>;
  updateRoutine: (routineId: string, input: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentStudioApplyStep {
  label: string;
  ok: boolean;
  error?: string;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function scheduleLabel(change: AgentStudioScheduleChange) {
  if (change.action === "create") return `Add schedule "${change.title}" (${change.plainSchedule})`;
  if (change.action === "update") return `Move "${change.title}" to ${change.plainSchedule}`;
  return `Pause "${change.title}"`;
}

/**
 * Apply an approved proposal through the normal APIs: rules first (one
 * instructions revision), then each schedule change. A failed step does not
 * stop the others; the caller shows every step's result.
 */
export async function applyAgentStudioProposal(input: {
  agentId: string;
  entryFile: AgentStudioEntryFile;
  proposal: AgentStudioProposal;
  defaultTimezone: string;
  deps: AgentStudioApplyDeps;
}): Promise<AgentStudioApplyStep[]> {
  const { agentId, entryFile, proposal, deps } = input;
  const steps: AgentStudioApplyStep[] = [];
  try {
    await deps.saveInstructions({
      path: entryFile.path,
      content: applyAgentStudioRules(entryFile.content, proposal.rules),
      baseHash: entryFile.contentHash ?? null,
      baseRevisionId: entryFile.revisionId ?? null,
    });
    steps.push({ label: "Save the agent's rules", ok: true });
  } catch (error) {
    // Without the rules saved, schedules would run on old instructions.
    return [{ label: "Save the agent's rules", ok: false, error: errorText(error) }];
  }

  for (const change of proposal.scheduleChanges) {
    const label = scheduleLabel(change);
    try {
      const timezone = change.timezone?.trim() || input.defaultTimezone;
      if (change.action === "create") {
        const routine = await deps.createRoutine({
          title: change.title,
          description: change.description,
          assigneeAgentId: agentId,
          status: "active",
        });
        await deps.createScheduleTrigger(routine.id, { kind: "schedule", cronExpression: change.cronExpression!, timezone });
      } else if (change.action === "update") {
        await deps.updateRoutine(change.routineId!, { schedule: { cronExpression: change.cronExpression!, timezone } });
      } else {
        await deps.updateRoutine(change.routineId!, { status: "paused" });
      }
      steps.push({ label, ok: true });
    } catch (error) {
      steps.push({ label, ok: false, error: errorText(error) });
    }
  }
  return steps;
}

export interface AgentStudioRuleDiffLine {
  text: string;
  change: "added" | "removed" | "kept";
}

export interface AgentStudioRuleDiffSection {
  key: string;
  heading: string;
  lines: AgentStudioRuleDiffLine[];
  changed: boolean;
}

/** Per-section list of kept, added and removed rules for the preview. */
export function diffAgentStudioRules(before: AgentStudioRules, after: AgentStudioRules): AgentStudioRuleDiffSection[] {
  const sections: AgentStudioRuleDiffSection[] = [];
  const jobBefore = before.job.trim();
  const jobAfter = after.job.trim();
  const jobLines: AgentStudioRuleDiffLine[] = jobBefore === jobAfter
    ? (jobAfter ? [{ text: jobAfter, change: "kept" }] : [])
    : [
        ...(jobBefore ? [{ text: jobBefore, change: "removed" as const }] : []),
        ...(jobAfter ? [{ text: jobAfter, change: "added" as const }] : []),
      ];
  sections.push({ key: "job", heading: "Job", lines: jobLines, changed: jobBefore !== jobAfter });
  for (const section of AGENT_STUDIO_RULE_SECTIONS) {
    const oldItems = before[section.key];
    const newItems = after[section.key];
    const oldSet = new Set(oldItems);
    const newSet = new Set(newItems);
    const lines: AgentStudioRuleDiffLine[] = [
      ...newItems.map((text) => ({ text, change: oldSet.has(text) ? ("kept" as const) : ("added" as const) })),
      ...oldItems.filter((text) => !newSet.has(text)).map((text) => ({ text, change: "removed" as const })),
    ];
    sections.push({ key: section.key, heading: section.heading, lines, changed: lines.some((l) => l.change !== "kept") });
  }
  return sections;
}

export type AgentStudioManualTarget = "job" | "alwaysDo" | "neverDo" | "askFirst" | "noApprovalNeeded";

/**
 * Build a proposal without AI: the board's sentence is added as written to the
 * chosen section (or becomes the job). Agents read plain English, so this
 * takes effect as written.
 */
export function manualRuleProposal(
  current: AgentStudioRules,
  target: AgentStudioManualTarget,
  text: string,
): AgentStudioProposal {
  const sentence = text.replace(/\s+/g, " ").trim();
  const rules: AgentStudioRules = {
    job: current.job,
    alwaysDo: [...current.alwaysDo],
    neverDo: [...current.neverDo],
    askFirst: [...current.askFirst],
    noApprovalNeeded: [...current.noApprovalNeeded],
  };
  if (target === "job") rules.job = text.trim();
  else if (!rules[target].includes(sentence)) rules[target].push(sentence);
  const heading = target === "job" ? "Job" : AGENT_STUDIO_RULE_SECTIONS.find((s) => s.key === target)!.heading;
  return {
    summary: target === "job" ? "Replaces the agent's job with your text." : `Adds your sentence to "${heading}".`,
    rules,
    scheduleChanges: [],
    enforcementNotes: [],
    warnings: [],
  };
}

/** Build a proposal without AI that adds one schedule and keeps the rules as they are. */
export function manualScheduleProposal(
  current: AgentStudioRules,
  input: { title: string; description: string; cronExpression: string; timezone: string; plainSchedule: string },
): AgentStudioProposal {
  return {
    summary: `Adds the schedule "${input.title.trim()}" (${input.plainSchedule}).`,
    rules: current,
    scheduleChanges: [{
      action: "create",
      routineId: null,
      title: input.title.trim(),
      description: input.description.trim(),
      cronExpression: input.cronExpression.trim(),
      timezone: input.timezone,
      plainSchedule: input.plainSchedule,
    }],
    enforcementNotes: [],
    warnings: [],
  };
}
