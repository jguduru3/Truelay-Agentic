import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { agents, type Db } from "@paperclipai/db";
import {
  agentStudioPreviewRequestSchema,
  type AgentStudioPreviewResponse,
  type AgentStudioStatus,
} from "@paperclipai/shared";
import { HttpError, notFound, unprocessable } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/activity-log.js";
import {
  agentStudioConfig,
  anthropicAgentStudioGenerator,
  claudeCliAgentStudioGenerator,
  previewAgentStudioChange,
  type AgentStudioConfig,
  type AgentStudioGenerator,
} from "../services/agent-studio.js";
import { assertCompanyAccess, assertInstanceAdmin, getActorInfo } from "./authz.js";

/**
 * Agent Studio routes (super admin only).
 *
 * The preview route turns plain English into a proposed rule set and schedule
 * changes. It changes nothing: the board applies a proposal through the
 * existing instructions and routines routes, which keep their own permission
 * checks, revision history and activity log entries.
 */
export function agentStudioRoutes(
  db: Db,
  options: {
    config?: () => AgentStudioConfig;
    generator?: (config: AgentStudioConfig) => AgentStudioGenerator;
  } = {},
) {
  const router = Router();
  const readConfig = options.config ?? (() => agentStudioConfig());
  const makeGenerator = options.generator ?? ((config: AgentStudioConfig) =>
    config.provider === "anthropic_api" && config.apiKey
      ? anthropicAgentStudioGenerator(config.apiKey)
      : claudeCliAgentStudioGenerator());

  router.get("/companies/:companyId/agent-studio/status", (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertInstanceAdmin(req);
    const config = readConfig();
    const body: AgentStudioStatus = { aiConfigured: config.provider !== null, provider: config.provider, model: config.model };
    res.set("Cache-Control", "no-store");
    res.json(body);
  });

  router.post(
    "/companies/:companyId/agent-studio/agents/:agentId/preview",
    validate(agentStudioPreviewRequestSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const agentId = req.params.agentId as string;
      assertCompanyAccess(req, companyId);
      assertInstanceAdmin(req);
      const [agent] = await db
        .select({ id: agents.id, name: agents.name, role: agents.role, title: agents.title })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)))
        .limit(1);
      if (!agent) throw notFound("Agent not found");

      const config = readConfig();
      if (!config.provider) {
        throw unprocessable(
          "No AI is connected. Set ANTHROPIC_API_KEY on the server, or install and sign in to the Claude CLI on it. \"Add rule\" works without AI.",
          { code: "AGENT_STUDIO_AI_NOT_CONFIGURED" },
        );
      }
      const outcome = await previewAgentStudioChange({
        agent: { name: agent.name, role: agent.role ?? null, title: agent.title ?? null },
        request: req.body,
        model: config.model,
        generate: makeGenerator(config),
      });

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_studio.preview_generated",
        entityType: "agent",
        entityId: agent.id,
        details: {
          model: config.model,
          provider: config.provider,
          ok: outcome.ok,
          ...(outcome.ok
            ? { scheduleChanges: outcome.proposal.scheduleChanges.length, warnings: outcome.proposal.warnings.length }
            : { code: outcome.code }),
        },
      });

      if (!outcome.ok) throw new HttpError(502, outcome.message, { code: outcome.code });
      const body: AgentStudioPreviewResponse = { proposal: outcome.proposal, model: config.model };
      res.json(body);
    },
  );

  return router;
}
