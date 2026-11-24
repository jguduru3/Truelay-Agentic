import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentStudioProposal } from "@paperclipai/shared";

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../services/activity-log.js", () => ({ logActivity: mockLogActivity }));

const COMPANY = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY = "22222222-2222-4222-8222-222222222222";
const AGENT = "33333333-3333-4333-8333-333333333333";
const ROUTINE = "44444444-4444-4444-8444-444444444444";

const adminActor = { type: "board", userId: "admin", source: "session", isInstanceAdmin: true, companyIds: [COMPANY] };
const ownerActor = {
  type: "board", userId: "owner", source: "session", isInstanceAdmin: false, companyIds: [COMPANY],
  memberships: [{ companyId: COMPANY, status: "active", membershipRole: "owner" }],
};

const proposal: AgentStudioProposal = {
  summary: "Adds a 03:30 buy plan and a Rs 2 lakh approval limit.",
  rules: {
    job: "Build the daily buy plan.",
    alwaysDo: ["Compare two suppliers."],
    neverDo: [],
    askFirst: ["Purchase orders above Rs 2,00,000."],
    noApprovalNeeded: [],
  },
  scheduleChanges: [{
    action: "create", routineId: null, title: "Daily buy plan", description: "Build the buy plan.",
    cronExpression: "30 3 * * *", timezone: "Asia/Kolkata", plainSchedule: "Every day at 03:30",
  }],
  enforcementNotes: [{ rule: "Purchase orders above Rs 2,00,000.", enforcement: "agent_follows", explanation: "Amount-based." }],
  warnings: [],
};

const body = {
  request: "Make the buy plan every day at 3:30 and ask me before any PO above 2 lakh.",
  currentRules: { job: "", alwaysDo: [], neverDo: [], askFirst: [], noApprovalNeeded: [] },
  currentSchedules: [{ routineId: ROUTINE, title: "Old sweep", cronExpression: "0 */2 * * *", timezone: "UTC", status: "active" }],
  defaultTimezone: "Asia/Kolkata",
};

let modules: {
  errorHandler: typeof import("../middleware/error-handler.js")["errorHandler"];
  agentStudioRoutes: typeof import("../routes/agent-studio.js")["agentStudioRoutes"];
};

function fakeDb(rows: unknown[]) {
  const chain = { from: () => chain, where: () => chain, limit: async () => rows };
  return { select: () => chain } as any;
}

async function createApp(input: {
  actor: Record<string, unknown>;
  rows?: unknown[];
  apiKey?: string | null;
  generate?: (args: { system: string; prompt: string; model: string }) => Promise<unknown>;
}) {
  const { errorHandler, agentStudioRoutes } = modules;
  const generate = vi.fn(input.generate ?? (async () => proposal));
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = input.actor;
    next();
  });
  app.use("/api", agentStudioRoutes(fakeDb(input.rows ?? [{ id: AGENT, name: "Supply Planner", role: "general", title: null }]), {
    config: () => {
      const apiKey = input.apiKey === undefined ? "test-key" : input.apiKey;
      return { provider: apiKey ? "anthropic_api" : null, apiKey, model: "test-model" };
    },
    generator: () => generate,
  }));
  app.use(errorHandler);
  return { app, generate };
}

const previewPath = (companyId = COMPANY) => `/api/companies/${companyId}/agent-studio/agents/${AGENT}/preview`;

describe("agent studio routes", () => {
  beforeAll(async () => {
    const [{ errorHandler }, { agentStudioRoutes }] = await Promise.all([
      import("../middleware/error-handler.js"),
      import("../routes/agent-studio.js"),
    ]);
    modules = { errorHandler, agentStudioRoutes };
  }, 180_000);
  beforeEach(() => vi.clearAllMocks());

  it("returns the proposal to an instance admin and logs the preview", async () => {
    const { app, generate } = await createApp({ actor: adminActor });
    const res = await request(app).post(previewPath()).send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ proposal, model: "test-model" });
    const call = generate.mock.calls[0]![0];
    expect(call.model).toBe("test-model");
    expect(call.prompt).toContain("Supply Planner");
    expect(call.prompt).toContain(ROUTINE);
    expect(call.prompt).toContain("<board_request>\nMake the buy plan");
    expect(mockLogActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      companyId: COMPANY, action: "agent_studio.preview_generated", entityId: AGENT,
      details: { model: "test-model", provider: "anthropic_api", ok: true, scheduleChanges: 1, warnings: 0 },
    }));
  });

  it("allows the local trusted operator", async () => {
    const { app } = await createApp({ actor: { type: "board", userId: "local-board", source: "local_implicit" } });
    expect((await request(app).post(previewPath()).send(body)).status).toBe(200);
  });

  it("refuses a company owner who is not a super admin, before calling the AI", async () => {
    const { app, generate } = await createApp({ actor: ownerActor });
    const res = await request(app).post(previewPath()).send(body);
    expect(res.status).toBe(403);
    expect(generate).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect((await request(app).get(`/api/companies/${COMPANY}/agent-studio/status`)).status).toBe(403);
  });

  it("refuses an instance admin outside the company", async () => {
    const { app, generate } = await createApp({ actor: adminActor });
    expect((await request(app).post(previewPath(OTHER_COMPANY)).send(body)).status).toBe(403);
    expect(generate).not.toHaveBeenCalled();
  });

  it("refuses agents", async () => {
    const { app } = await createApp({ actor: { type: "agent", agentId: AGENT, companyId: COMPANY, source: "agent_key" } });
    expect((await request(app).post(previewPath()).send(body)).status).toBe(403);
  });

  it("returns 404 for an agent in another company", async () => {
    const { app, generate } = await createApp({ actor: adminActor, rows: [] });
    expect((await request(app).post(previewPath()).send(body)).status).toBe(404);
    expect(generate).not.toHaveBeenCalled();
  });

  it("explains when no API key is configured", async () => {
    const { app, generate } = await createApp({ actor: adminActor, apiKey: null });
    const res = await request(app).post(previewPath()).send(body);
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain("AGENT_STUDIO_AI_NOT_CONFIGURED");
    expect(generate).not.toHaveBeenCalled();
    const status = await request(app).get(`/api/companies/${COMPANY}/agent-studio/status`);
    expect(status.body).toEqual({ aiConfigured: false, provider: null, model: "test-model" });
  });

  it("rejects an empty request", async () => {
    const { app } = await createApp({ actor: adminActor });
    expect((await request(app).post(previewPath()).send({ ...body, request: "  " })).status).toBe(400);
  });

  it("turns AI failures and malformed answers into a 502 and logs them", async () => {
    const failing = await createApp({ actor: adminActor, generate: async () => { throw new Error("overloaded"); } });
    const failed = await request(failing.app).post(previewPath()).send(body);
    expect(failed.status).toBe(502);
    expect(JSON.stringify(failed.body)).toContain("overloaded");

    const malformed = await createApp({ actor: adminActor, generate: async () => ({ summary: "x" }) });
    const bad = await request(malformed.app).post(previewPath()).send(body);
    expect(bad.status).toBe(502);
    expect(mockLogActivity).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({
      details: { model: "test-model", provider: "anthropic_api", ok: false, code: "AGENT_STUDIO_INVALID_OUTPUT" },
    }));
  });

  it("adds a warning when the AI points at a schedule the agent does not have", async () => {
    const { app } = await createApp({
      actor: adminActor,
      generate: async () => ({
        ...proposal,
        scheduleChanges: [{ ...proposal.scheduleChanges[0]!, action: "pause", routineId: "55555555-5555-4555-8555-555555555555" }],
      }),
    });
    const res = await request(app).post(previewPath()).send(body);
    expect(res.status).toBe(200);
    expect(res.body.proposal.warnings[0]).toContain("refers to a schedule this agent does not have");
  });
});
