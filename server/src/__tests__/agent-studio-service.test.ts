import { describe, expect, it } from "vitest";
import { agentStudioConfig, extractJsonObject } from "../services/agent-studio.js";

describe("agentStudioConfig", () => {
  it("prefers an API key", () => {
    expect(agentStudioConfig({ ANTHROPIC_API_KEY: " key " }, () => true)).toEqual({
      provider: "anthropic_api", apiKey: "key", model: "claude-sonnet-5-5",
    });
  });

  it("falls back to the Claude CLI when there is no key", () => {
    expect(agentStudioConfig({ AGENT_STUDIO_MODEL: "m" }, () => true)).toEqual({ provider: "claude_cli", apiKey: null, model: "m" });
  });

  it("reports no AI when neither is available, or the CLI is turned off", () => {
    expect(agentStudioConfig({}, () => false).provider).toBeNull();
    expect(agentStudioConfig({ AGENT_STUDIO_CLAUDE_CLI: "off" }, () => true).provider).toBeNull();
  });
});

describe("extractJsonObject", () => {
  it("reads plain, fenced and padded JSON", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonObject('Here it is:\n```json\n{"a":{"b":2}}\n```\nDone.')).toEqual({ a: { b: 2 } });
    expect(extractJsonObject('Sure. {"a":[1,2]} Thanks')).toEqual({ a: [1, 2] });
  });

  it("throws when there is no object", () => {
    expect(() => extractJsonObject("no json here")).toThrow("no JSON object");
  });
});
