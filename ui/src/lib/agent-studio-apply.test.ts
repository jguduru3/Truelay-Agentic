import { describe, expect, it, vi } from "vitest";
import { parseAgentStudioRules, type AgentStudioProposal } from "@paperclipai/shared";
import { applyAgentStudioProposal, diffAgentStudioRules } from "./agent-studio-apply";

const ROUTINE = "44444444-4444-4444-8444-444444444444";
const proposal: AgentStudioProposal = {
  summary: "s",
  rules: { job: "Plan buying.", alwaysDo: ["Compare suppliers."], neverDo: [], askFirst: ["POs above Rs 2,00,000."], noApprovalNeeded: [] },
  scheduleChanges: [
    { action: "create", routineId: null, title: "Buy plan", description: "Build it.", cronExpression: "30 3 * * *", timezone: null, plainSchedule: "Every day at 03:30" },
    { action: "update", routineId: ROUTINE, title: "Sweep", description: "", cronExpression: "0 */3 * * *", timezone: "UTC", plainSchedule: "Every 3 hours" },
    { action: "pause", routineId: ROUTINE, title: "Old", description: "", cronExpression: null, timezone: null, plainSchedule: "" },
  ],
  enforcementNotes: [],
  warnings: [],
};

function deps() {
  return {
    saveInstructions: vi.fn(async (_input: { path: string; content: string; baseHash: string | null; baseRevisionId: string | null }) => ({})),
    createRoutine: vi.fn(async (_input: unknown) => ({ id: "new-routine" })),
    createScheduleTrigger: vi.fn(async (_id: string, _input: unknown) => ({})),
    updateRoutine: vi.fn(async (_id: string, _input: unknown) => ({})),
  };
}

const entryFile = { path: "AGENTS.md", content: "# Supply Planner\n", contentHash: "hash-1", revisionId: "rev-1" };

describe("applyAgentStudioProposal", () => {
  it("saves rules into the entry file and applies every schedule change", async () => {
    const d = deps();
    const steps = await applyAgentStudioProposal({ agentId: "agent-1", entryFile, proposal, defaultTimezone: "Asia/Kolkata", deps: d });
    expect(steps.every((s) => s.ok)).toBe(true);
    expect(steps).toHaveLength(4);
    const saved = d.saveInstructions.mock.calls[0]![0];
    expect(saved).toMatchObject({ path: "AGENTS.md", baseHash: "hash-1", baseRevisionId: "rev-1" });
    expect(saved.content.startsWith("# Supply Planner\n")).toBe(true);
    expect(parseAgentStudioRules(saved.content)).toEqual(proposal.rules);
    expect(d.createRoutine).toHaveBeenCalledWith({ title: "Buy plan", description: "Build it.", assigneeAgentId: "agent-1", status: "active" });
    expect(d.createScheduleTrigger).toHaveBeenCalledWith("new-routine", { kind: "schedule", cronExpression: "30 3 * * *", timezone: "Asia/Kolkata" });
    expect(d.updateRoutine).toHaveBeenCalledWith(ROUTINE, { schedule: { cronExpression: "0 */3 * * *", timezone: "UTC" } });
    expect(d.updateRoutine).toHaveBeenCalledWith(ROUTINE, { status: "paused" });
  });

  it("stops before schedules when the rules cannot be saved", async () => {
    const d = deps();
    d.saveInstructions.mockRejectedValueOnce(new Error("Someone else edited this file"));
    const steps = await applyAgentStudioProposal({ agentId: "agent-1", entryFile, proposal, defaultTimezone: "UTC", deps: d });
    expect(steps).toEqual([{ label: "Save the agent's rules", ok: false, error: "Someone else edited this file" }]);
    expect(d.createRoutine).not.toHaveBeenCalled();
  });

  it("reports a failed schedule step and carries on", async () => {
    const d = deps();
    d.createScheduleTrigger.mockRejectedValueOnce(new Error("Invalid cron"));
    const steps = await applyAgentStudioProposal({ agentId: "agent-1", entryFile, proposal, defaultTimezone: "UTC", deps: d });
    expect(steps.map((s) => s.ok)).toEqual([true, false, true, true]);
    expect(steps[1]!.error).toBe("Invalid cron");
  });
});

describe("diffAgentStudioRules", () => {
  it("marks added, removed and kept rules per section", () => {
    const before = { job: "Plan buying.", alwaysDo: ["A", "B"], neverDo: [], askFirst: [], noApprovalNeeded: [] };
    const after = { job: "Plan buying.", alwaysDo: ["A", "C"], neverDo: [], askFirst: [], noApprovalNeeded: [] };
    const diff = diffAgentStudioRules(before, after);
    expect(diff[0]).toMatchObject({ key: "job", changed: false });
    expect(diff[1]).toEqual({
      key: "alwaysDo", heading: "Always do", changed: true,
      lines: [{ text: "A", change: "kept" }, { text: "C", change: "added" }, { text: "B", change: "removed" }],
    });
    expect(diff[2]!.changed).toBe(false);
  });
});

describe("manual proposals (no AI)", () => {
  const current = { job: "Plan buying.", alwaysDo: ["A"], neverDo: [], askFirst: [], noApprovalNeeded: [] };

  it("adds a sentence to the chosen section and leaves the rest alone", async () => {
    const { manualRuleProposal } = await import("./agent-studio-apply");
    const p = manualRuleProposal(current, "neverDo", "  Never buy  from unlicensed\nsuppliers. ");
    expect(p.rules.neverDo).toEqual(["Never buy from unlicensed suppliers."]);
    expect(p.rules.alwaysDo).toEqual(["A"]);
    expect(current.neverDo).toEqual([]);
    expect(p.summary).toBe('Adds your sentence to "Never do".');
    expect(manualRuleProposal(current, "alwaysDo", "A").rules.alwaysDo).toEqual(["A"]);
  });

  it("replaces the job", async () => {
    const { manualRuleProposal } = await import("./agent-studio-apply");
    expect(manualRuleProposal(current, "job", "New job.\nSecond line.").rules.job).toBe("New job.\nSecond line.");
  });

  it("builds a single schedule creation", async () => {
    const { manualScheduleProposal } = await import("./agent-studio-apply");
    const p = manualScheduleProposal(current, { title: " Stock check ", description: "Check stock.", cronExpression: "0 9 * * 1", timezone: "Asia/Kolkata", plainSchedule: "Mondays at 09:00" });
    expect(p.rules).toBe(current);
    expect(p.scheduleChanges).toEqual([{ action: "create", routineId: null, title: "Stock check", description: "Check stock.", cronExpression: "0 9 * * 1", timezone: "Asia/Kolkata", plainSchedule: "Mondays at 09:00" }]);
  });
});
