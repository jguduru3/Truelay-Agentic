import { z } from "zod";

/**
 * Agent Studio: the board writes each agent's job and rules in plain English.
 *
 * The rules live inside the agent's instructions entry file (AGENTS.md) between
 * two HTML comment markers, so the agent reads them on every run and every
 * change goes through the normal instruction revision history.
 */
export const AGENT_STUDIO_BLOCK_START = "<!-- agent-studio:rules:start -->";
export const AGENT_STUDIO_BLOCK_END = "<!-- agent-studio:rules:end -->";

const ruleLine = z.string().trim().min(1).max(500);
const ruleList = z.array(ruleLine).max(40);

export const agentStudioRulesSchema = z.object({
  job: z.string().trim().max(4000),
  alwaysDo: ruleList,
  neverDo: ruleList,
  askFirst: ruleList,
  noApprovalNeeded: ruleList,
});
export type AgentStudioRules = z.infer<typeof agentStudioRulesSchema>;

export const EMPTY_AGENT_STUDIO_RULES: AgentStudioRules = {
  job: "",
  alwaysDo: [],
  neverDo: [],
  askFirst: [],
  noApprovalNeeded: [],
};

export const AGENT_STUDIO_RULE_SECTIONS = [
  { key: "alwaysDo", heading: "Always do" },
  { key: "neverDo", heading: "Never do" },
  { key: "askFirst", heading: "Ask the board first" },
  { key: "noApprovalNeeded", heading: "No approval needed" },
] as const satisfies ReadonlyArray<{ key: Exclude<keyof AgentStudioRules, "job">; heading: string }>;

const JOB_HEADING = "Job";

/** Render the rules as the managed Markdown block an agent reads. */
export function renderAgentStudioBlock(rules: AgentStudioRules): string {
  const lines = [
    AGENT_STUDIO_BLOCK_START,
    "## Rules set by the board",
    "",
    "These rules come from the board through Agent Studio. They override anything above that conflicts with them.",
    "When a rule says to ask the board first, create an approval request and wait for it before acting.",
    "",
    `### ${JOB_HEADING}`,
    "",
    rules.job.trim() || "_Not set._",
  ];
  for (const section of AGENT_STUDIO_RULE_SECTIONS) {
    lines.push("", `### ${section.heading}`, "");
    const items = rules[section.key];
    if (items.length === 0) lines.push("_None._");
    else for (const item of items) lines.push(`- ${item.replace(/\s*\n\s*/g, " ").trim()}`);
  }
  lines.push("", AGENT_STUDIO_BLOCK_END);
  return lines.join("\n");
}

function blockBounds(markdown: string) {
  const start = markdown.indexOf(AGENT_STUDIO_BLOCK_START);
  if (start < 0) return null;
  const endMarker = markdown.indexOf(AGENT_STUDIO_BLOCK_END, start);
  if (endMarker < 0) return null;
  return { start, end: endMarker + AGENT_STUDIO_BLOCK_END.length };
}

/** Read the rules block out of an instructions file; null when there is none. */
export function parseAgentStudioRules(markdown: string): AgentStudioRules | null {
  const bounds = blockBounds(markdown);
  if (!bounds) return null;
  const body = markdown.slice(bounds.start + AGENT_STUDIO_BLOCK_START.length, bounds.end - AGENT_STUDIO_BLOCK_END.length);
  const rules: AgentStudioRules = { job: "", alwaysDo: [], neverDo: [], askFirst: [], noApprovalNeeded: [] };
  const headingToKey = new Map<string, keyof AgentStudioRules>([
    [JOB_HEADING.toLowerCase(), "job"],
    ...AGENT_STUDIO_RULE_SECTIONS.map((s) => [s.heading.toLowerCase(), s.key] as [string, keyof AgentStudioRules]),
  ]);
  let current: keyof AgentStudioRules | null = null;
  const jobLines: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const heading = /^###\s+(.+?)\s*$/.exec(raw);
    if (heading) {
      current = headingToKey.get(heading[1]!.toLowerCase()) ?? null;
      continue;
    }
    if (!current) continue;
    const line = raw.trim();
    if (current === "job") {
      jobLines.push(raw);
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) rules[current].push(item[1]!.trim());
  }
  const job = jobLines.join("\n").trim();
  rules.job = job === "_Not set._" ? "" : job;
  return rules;
}

/** Replace the rules block in an instructions file, or append one when missing. */
export function applyAgentStudioRules(markdown: string, rules: AgentStudioRules): string {
  const block = renderAgentStudioBlock(rules);
  const bounds = blockBounds(markdown);
  if (bounds) return markdown.slice(0, bounds.start) + block + markdown.slice(bounds.end);
  const base = markdown.replace(/\s+$/, "");
  return base ? `${base}\n\n${block}\n` : `${block}\n`;
}

/** A schedule the agent already has, sent so the model can change it. */
export const agentStudioCurrentScheduleSchema = z.object({
  routineId: z.string().guid(),
  title: z.string().max(200),
  cronExpression: z.string().max(200).nullable(),
  timezone: z.string().max(100).nullable(),
  status: z.string().max(40),
});
export type AgentStudioCurrentSchedule = z.infer<typeof agentStudioCurrentScheduleSchema>;

export const agentStudioPreviewRequestSchema = z.object({
  request: z.string().trim().min(1).max(4000),
  currentRules: agentStudioRulesSchema,
  currentSchedules: z.array(agentStudioCurrentScheduleSchema).max(100),
  defaultTimezone: z.string().trim().min(1).max(100).optional(),
});
export type AgentStudioPreviewRequest = z.infer<typeof agentStudioPreviewRequestSchema>;

export const AGENT_STUDIO_SCHEDULE_ACTIONS = ["create", "update", "pause"] as const;
export const AGENT_STUDIO_ENFORCEMENT = ["agent_follows", "needs_tool_setting"] as const;

export const agentStudioScheduleChangeSchema = z.object({
  action: z.enum(AGENT_STUDIO_SCHEDULE_ACTIONS),
  /** Required for update and pause: one of the current schedules. */
  routineId: z.string().guid().nullable(),
  title: z.string().trim().min(1).max(200),
  /** What the agent does when this schedule fires. */
  description: z.string().trim().max(4000),
  /** Five-field cron. Required for create and update. */
  cronExpression: z.string().trim().max(200).nullable(),
  timezone: z.string().trim().max(100).nullable(),
  /** The schedule in plain words, e.g. "Every day at 03:30". */
  plainSchedule: z.string().trim().max(200),
});
export type AgentStudioScheduleChange = z.infer<typeof agentStudioScheduleChangeSchema>;

export const agentStudioEnforcementNoteSchema = z.object({
  rule: z.string().trim().min(1).max(500),
  enforcement: z.enum(AGENT_STUDIO_ENFORCEMENT),
  explanation: z.string().trim().max(500),
});
export type AgentStudioEnforcementNote = z.infer<typeof agentStudioEnforcementNoteSchema>;

export const agentStudioProposalSchema = z.object({
  /** One or two plain sentences: what will change. */
  summary: z.string().trim().min(1).max(1000),
  /** The complete rule set after the change, not a diff. */
  rules: agentStudioRulesSchema,
  scheduleChanges: z.array(agentStudioScheduleChangeSchema).max(20),
  enforcementNotes: z.array(agentStudioEnforcementNoteSchema).max(40),
  /** Anything the model could not do or needs the board to clarify. */
  warnings: z.array(z.string().trim().min(1).max(500)).max(10),
});
export type AgentStudioProposal = z.infer<typeof agentStudioProposalSchema>;

export interface AgentStudioPreviewResponse {
  proposal: AgentStudioProposal;
  model: string;
}

export interface AgentStudioStatus {
  aiConfigured: boolean;
  /** Which AI prepares previews: an API key, or the Claude CLI signed in on the server. */
  provider: "anthropic_api" | "claude_cli" | null;
  model: string;
}

const CRON_FIELD = /^[\d*,/\-A-Za-z?LW#]+$/;
/** Cheap shape check; the routine service performs the full validation on apply. */
export function isPlausibleCronExpression(value: string | null | undefined): value is string {
  if (!value) return false;
  const fields = value.trim().split(/\s+/);
  return fields.length === 5 && fields.every((field) => CRON_FIELD.test(field));
}

/** Problems that make a proposal unsafe to apply as-is. */
export function agentStudioProposalProblems(
  proposal: AgentStudioProposal,
  currentSchedules: ReadonlyArray<Pick<AgentStudioCurrentSchedule, "routineId">>,
): string[] {
  const known = new Set(currentSchedules.map((s) => s.routineId));
  const problems: string[] = [];
  for (const change of proposal.scheduleChanges) {
    if (change.action !== "pause" && !isPlausibleCronExpression(change.cronExpression)) {
      problems.push(`"${change.title}" has no valid schedule time.`);
    }
    if (change.action !== "create" && (!change.routineId || !known.has(change.routineId))) {
      problems.push(`"${change.title}" refers to a schedule this agent does not have.`);
    }
  }
  return problems;
}
