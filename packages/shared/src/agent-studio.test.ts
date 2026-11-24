import { describe, expect, it } from "vitest";
import {
  AGENT_STUDIO_BLOCK_END,
  AGENT_STUDIO_BLOCK_START,
  agentStudioProposalProblems,
  applyAgentStudioRules,
  isPlausibleCronExpression,
  parseAgentStudioRules,
  type AgentStudioProposal,
  type AgentStudioRules,
} from "./agent-studio.js";

const rules: AgentStudioRules = {
  job: "Build the daily buy plan by 04:00.\nUse last night's orders.",
  alwaysDo: ["Compare at least two suppliers."],
  neverDo: ["Never place an order yourself."],
  askFirst: ["Any purchase order above Rs 2,00,000."],
  noApprovalNeeded: ["Draft purchase orders below Rs 2,00,000."],
};

describe("agent studio rules block", () => {
  it("round-trips rules through the managed block", () => {
    const markdown = applyAgentStudioRules("# Supply Planner\n\nYou plan buying.\n", rules);
    expect(markdown.startsWith("# Supply Planner\n\nYou plan buying.\n\n" + AGENT_STUDIO_BLOCK_START)).toBe(true);
    expect(parseAgentStudioRules(markdown)).toEqual(rules);
  });

  it("replaces only the block and keeps the text around it", () => {
    const first = applyAgentStudioRules("Intro\n", rules);
    const withTail = `${first}\nFooter text\n`;
    const next = applyAgentStudioRules(withTail, { ...rules, neverDo: [] });
    expect(next.startsWith("Intro\n\n")).toBe(true);
    expect(next.endsWith("\nFooter text\n")).toBe(true);
    expect(next.split(AGENT_STUDIO_BLOCK_START)).toHaveLength(2);
    expect(parseAgentStudioRules(next)?.neverDo).toEqual([]);
  });

  it("returns null when there is no block or it is unterminated", () => {
    expect(parseAgentStudioRules("# Agent\n")).toBeNull();
    expect(parseAgentStudioRules(`${AGENT_STUDIO_BLOCK_START}\n### Job\nx`)).toBeNull();
    expect(parseAgentStudioRules(`${AGENT_STUDIO_BLOCK_START}\n${AGENT_STUDIO_BLOCK_END}`)).toEqual({
      job: "", alwaysDo: [], neverDo: [], askFirst: [], noApprovalNeeded: [],
    });
  });

  it("flattens multi-line rule items so they stay one bullet", () => {
    const markdown = applyAgentStudioRules("", { ...rules, alwaysDo: ["Line one\nline two"] });
    expect(parseAgentStudioRules(markdown)?.alwaysDo).toEqual(["Line one line two"]);
  });
});

describe("agent studio proposal checks", () => {
  const routineId = "00000000-0000-4000-8000-000000000001";
  const base: AgentStudioProposal = { summary: "s", rules, scheduleChanges: [], enforcementNotes: [], warnings: [] };

  it("accepts five-field cron and rejects others", () => {
    expect(isPlausibleCronExpression("30 3 * * *")).toBe(true);
    expect(isPlausibleCronExpression("0 10 * * 1-6")).toBe(true);
    expect(isPlausibleCronExpression("every day")).toBe(false);
    expect(isPlausibleCronExpression("0 0 3 * * *")).toBe(false);
    expect(isPlausibleCronExpression(null)).toBe(false);
  });

  it("flags bad times and unknown schedules", () => {
    const problems = agentStudioProposalProblems({
      ...base,
      scheduleChanges: [
        { action: "create", routineId: null, title: "Buy plan", description: "", cronExpression: "daily", timezone: null, plainSchedule: "" },
        { action: "pause", routineId: "00000000-0000-4000-8000-000000000999", title: "Old", description: "", cronExpression: null, timezone: null, plainSchedule: "" },
        { action: "update", routineId, title: "Sweep", description: "", cronExpression: "0 */2 * * *", timezone: "Asia/Kolkata", plainSchedule: "" },
      ],
    }, [{ routineId }]);
    expect(problems).toEqual([
      '"Buy plan" has no valid schedule time.',
      '"Old" refers to a schedule this agent does not have.',
    ]);
  });
});
