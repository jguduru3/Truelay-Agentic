import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "@/lib/router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AGENT_STUDIO_RULE_SECTIONS,
  EMPTY_AGENT_STUDIO_RULES,
  parseAgentStudioRules,
  type Agent,
  type AgentStudioCurrentSchedule,
  type AgentStudioProposal,
  type AgentStudioRules,
  type RoutineListItem,
} from "@paperclipai/shared";
import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { agentStudioApi } from "../api/agentStudio";
import { agentsApi } from "../api/agents";
import { routinesApi } from "../api/routines";
import { describeSchedule, ScheduleEditor } from "../components/ScheduleEditor";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useIsSuperAdmin } from "../hooks/useIsSuperAdmin";
import {
  applyAgentStudioProposal,
  diffAgentStudioRules,
  manualRuleProposal,
  manualScheduleProposal,
  type AgentStudioApplyStep,
  type AgentStudioEntryFile,
  type AgentStudioManualTarget,
} from "../lib/agent-studio-apply";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { queryKeys } from "../lib/queryKeys";
import { cn, formatCents } from "../lib/utils";

// Browsers may report legacy IANA names; use the current ones so new schedules match the imported routines.
const LEGACY_TIMEZONES: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Saigon": "Asia/Ho_Chi_Minh" };
const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const DEFAULT_TIMEZONE = LEGACY_TIMEZONES[BROWSER_TIMEZONE] ?? BROWSER_TIMEZONE;

type RuleListKey = (typeof AGENT_STUDIO_RULE_SECTIONS)[number]["key"];

const SECTION_HINTS: Record<RuleListKey, string> = {
  alwaysDo: "Things this agent must always do.",
  neverDo: "Things this agent must never do.",
  askFirst: "Actions that wait for a board approval. Include the limit, like \"refunds above Rs 2,000\".",
  noApprovalNeeded: "Actions it may take on its own, with the limit.",
};

const EXAMPLE_REQUEST =
  "Every day at 3:30 make the buy plan from last night's orders and send it to the Procurement Executive by 4:00. " +
  "Ask me before any purchase order above Rs 2 lakh. Never contact suppliers directly.";

const MANUAL_TARGETS: Array<{ value: AgentStudioManualTarget; label: string }> = [
  { value: "alwaysDo", label: "Always do" },
  { value: "neverDo", label: "Never do" },
  { value: "askFirst", label: "Ask the board first" },
  { value: "noApprovalNeeded", label: "No approval needed" },
  { value: "job", label: "Job (replaces it)" },
];

interface AgentEntry {
  file: AgentStudioEntryFile | null;
  rules: AgentStudioRules;
  hasRules: boolean;
  error: string | null;
  loading: boolean;
}

function scheduleOf(routine: RoutineListItem) {
  return routine.triggers.find((t) => t.kind === "schedule" && t.enabled) ?? routine.triggers.find((t) => t.kind === "schedule") ?? null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sortAgents(agents: Agent[]) {
  return [...agents].sort((a, b) => {
    if (a.role === "ceo" && b.role !== "ceo") return -1;
    if (b.role === "ceo" && a.role !== "ceo") return 1;
    return a.name.localeCompare(b.name);
  });
}

export function AgentStudio() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAgentId = searchParams.get("agent");

  useEffect(() => setBreadcrumbs([{ label: "Agent Studio" }]), [setBreadcrumbs]);

  const { isSuperAdmin, isLoading: accessLoading } = useIsSuperAdmin();

  const status = useQuery({
    queryKey: ["agent-studio", "status", selectedCompanyId],
    queryFn: () => agentStudioApi.status(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId && isSuperAdmin),
  });
  const agents = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? "none"),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId && isSuperAdmin),
  });
  const routines = useQuery({
    queryKey: queryKeys.routines.list(selectedCompanyId ?? "none"),
    queryFn: () => routinesApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId && isSuperAdmin),
  });

  const sortedAgents = useMemo(
    () => sortAgents((agents.data ?? []).filter((a) => a.status !== "terminated")),
    [agents.data],
  );

  const entryQueries = useQueries({
    queries: sortedAgents.map((agent) => ({
      queryKey: ["agent-studio", "entry", agent.id],
      queryFn: async (): Promise<AgentStudioEntryFile> => {
        const bundle = await agentsApi.instructionsBundle(agent.id, selectedCompanyId!);
        const file = await agentsApi.instructionsFile(agent.id, bundle.entryFile, selectedCompanyId!);
        return { path: file.path, content: file.content, contentHash: file.contentHash, revisionId: file.revision?.id ?? null };
      },
      enabled: Boolean(selectedCompanyId),
      staleTime: 15_000,
    })),
  });

  const entries = useMemo(() => {
    const map = new Map<string, AgentEntry>();
    sortedAgents.forEach((agent, index) => {
      const query = entryQueries[index];
      const file = query?.data ?? null;
      const parsed = file ? parseAgentStudioRules(file.content) : null;
      map.set(agent.id, {
        file,
        rules: parsed ?? EMPTY_AGENT_STUDIO_RULES,
        hasRules: parsed !== null,
        error: query?.error ? errorMessage(query.error) : null,
        loading: query?.isLoading ?? true,
      });
    });
    return map;
    // entryQueries is a new array each render; its data/error/loading fields drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedAgents, ...entryQueries.map((q) => q.dataUpdatedAt), ...entryQueries.map((q) => q.errorUpdatedAt)]);

  const routinesByAgent = useMemo(() => {
    const map = new Map<string, RoutineListItem[]>();
    for (const routine of routines.data ?? []) {
      if (!routine.assigneeAgentId || routine.status === "archived") continue;
      const list = map.get(routine.assigneeAgentId) ?? [];
      list.push(routine);
      map.set(routine.assigneeAgentId, list);
    }
    return map;
  }, [routines.data]);

  if (accessLoading) return <p className="p-6 text-sm text-muted-foreground">Checking your access…</p>;
  if (!isSuperAdmin) {
    return (
      <div className="p-6 max-w-xl flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Agent Studio</h1>
        <p className="text-sm text-muted-foreground">
          Only a super admin (instance admin) can configure agents here. Ask a super admin to promote you in
          Settings → Instance → Access.
        </p>
      </div>
    );
  }
  if (!selectedCompanyId) return <p className="p-6 text-sm text-muted-foreground">Select a company first.</p>;

  const selectedAgent = sortedAgents.find((a) => a.id === selectedAgentId) ?? null;
  const selectAgent = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("agent", id);
    else next.delete("agent");
    setSearchParams(next, { replace: true });
  };

  const totalBudget = sortedAgents.reduce((sum, a) => sum + (a.budgetMonthlyCents ?? 0), 0);
  const totalSchedules = [...routinesByAgent.values()].reduce((sum, list) => sum + list.length, 0);
  const configured = sortedAgents.filter((a) => entries.get(a.id)?.hasRules).length;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Agent Studio</h1>
          <Badge variant="outline">Super admin</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell each agent its job and rules in plain English. AI prepares the change; nothing changes until you click Apply.
        </p>
      </header>

      {status.data && !status.data.aiConfigured ? (
        <Card className="p-4 flex flex-row gap-3 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <p className="text-sm">
            You can configure every agent now: open an agent, write in plain English and click "Add rule", or use "Add schedule".
            To also let AI split a long request into rules and schedules, set <code>ANTHROPIC_API_KEY</code> on the server or sign in
            to the Claude CLI on this computer (run <code>claude</code> once).
          </p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Agents" value={String(sortedAgents.length)} />
        <SummaryTile label="Rules set" value={`${configured} of ${sortedAgents.length}`} />
        <SummaryTile label="Schedules" value={String(totalSchedules)} />
        <SummaryTile label="Monthly AI budget" value={formatCents(totalBudget)} />
      </section>

      {agents.error ? <p className="text-sm text-destructive">Could not load agents: {errorMessage(agents.error)}</p> : null}
      {routines.error ? <p className="text-sm text-destructive">Could not load schedules: {errorMessage(routines.error)}</p> : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            entry={entries.get(agent.id)}
            schedules={routinesByAgent.get(agent.id) ?? []}
            selected={agent.id === selectedAgentId}
            onSelect={() => selectAgent(agent.id === selectedAgentId ? null : agent.id)}
          />
        ))}
        {agents.isLoading ? <p className="text-sm text-muted-foreground">Loading agents…</p> : null}
      </section>

      {selectedAgent ? (
        <AgentPanel
          key={selectedAgent.id}
          companyId={selectedCompanyId}
          agent={selectedAgent}
          entry={entries.get(selectedAgent.id)}
          schedules={routinesByAgent.get(selectedAgent.id) ?? []}
          aiConfigured={status.data?.aiConfigured !== false}
          onClose={() => selectAgent(null)}
        />
      ) : sortedAgents.length ? (
        <p className="text-sm text-muted-foreground">Pick an agent above to see and change its rules.</p>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold font-mono">{value}</span>
    </Card>
  );
}

function AgentCard(props: {
  agent: Agent;
  entry: AgentEntry | undefined;
  schedules: RoutineListItem[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { agent, entry, schedules, selected } = props;
  const rules = entry?.rules ?? EMPTY_AGENT_STUDIO_RULES;
  return (
    <button type="button" onClick={props.onSelect} className="text-left" aria-pressed={selected}>
      <Card className={cn("p-4 gap-2 h-full transition-colors hover:bg-accent/50", selected && "ring-2 ring-ring")}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{agent.name}</span>
          {agent.role === "ceo" ? <Badge variant="secondary">CEO</Badge> : null}
        </div>
        <span className="text-xs text-muted-foreground truncate">{agent.title || agent.role}</span>
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
          {entry?.loading ? "Loading rules…" : entry?.error ? "Could not read rules." : rules.job || "No job written yet."}
        </p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{schedules.length} schedule{schedules.length === 1 ? "" : "s"}</Badge>
          <Badge variant="outline">{rules.askFirst.length} ask first</Badge>
          <Badge variant="outline">{rules.neverDo.length} never</Badge>
          <Badge variant="outline" className="font-mono">{formatCents(agent.budgetMonthlyCents ?? 0)}/mo</Badge>
        </div>
      </Card>
    </button>
  );
}

function AgentPanel(props: {
  companyId: string;
  agent: Agent;
  entry: AgentEntry | undefined;
  schedules: RoutineListItem[];
  aiConfigured: boolean;
  onClose: () => void;
}) {
  const { companyId, agent, entry, schedules } = props;
  const queryClient = useQueryClient();
  const [request, setRequest] = useState("");
  const [proposal, setProposal] = useState<AgentStudioProposal | null>(null);
  const [steps, setSteps] = useState<AgentStudioApplyStep[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [manualTarget, setManualTarget] = useState<AgentStudioManualTarget>("alwaysDo");
  const [addingSchedule, setAddingSchedule] = useState(false);

  const currentRules = entry?.rules ?? EMPTY_AGENT_STUDIO_RULES;
  const currentSchedules: AgentStudioCurrentSchedule[] = schedules.map((routine) => {
    const trigger = scheduleOf(routine);
    return {
      routineId: routine.id,
      title: routine.title,
      cronExpression: trigger?.cronExpression ?? null,
      timezone: trigger?.timezone ?? null,
      status: routine.status,
    };
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agent-studio", "entry", agent.id] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.list(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.instructionsBundle(agent.id) }),
    ]);
  };

  const preview = useMutation({
    mutationFn: () =>
      agentStudioApi.preview(companyId, agent.id, {
        request,
        currentRules,
        currentSchedules,
        defaultTimezone: DEFAULT_TIMEZONE,
      }),
    onMutate: () => {
      setProposal(null);
      setSteps(null);
    },
    onSuccess: (result) => setProposal(result.proposal),
  });

  const apply = useMutation({
    mutationFn: async (input: { proposal: AgentStudioProposal }) => {
      if (!entry?.file) throw new Error("The agent's instructions are not loaded yet. Try again in a moment.");
      return applyAgentStudioProposal({
        agentId: agent.id,
        entryFile: entry.file,
        proposal: input.proposal,
        defaultTimezone: DEFAULT_TIMEZONE,
        deps: {
          saveInstructions: (data) => agentsApi.saveInstructionsFile(agent.id, data, companyId),
          createRoutine: (data) => routinesApi.create(companyId, data),
          createScheduleTrigger: (routineId, data) => routinesApi.createTrigger(routineId, data),
          updateRoutine: (routineId, data) => routinesApi.update(routineId, data),
        },
      });
    },
    onSuccess: async (result) => {
      setSteps(result);
      if (result.every((s) => s.ok)) {
        setProposal(null);
        setRequest("");
        setEditing(false);
      }
      await refresh();
    },
  });

  const statusChange = useMutation({
    mutationFn: (input: { routineId: string; status: "active" | "paused" }) =>
      routinesApi.update(input.routineId, { status: input.status }),
    onSuccess: refresh,
  });

  const blockingProblems =proposal?.warnings.filter((w) => w.includes("no valid schedule time") || w.includes("does not have")) ?? [];

  return (
    <Card className="p-5 gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{agent.name}</h2>
          <span className="text-xs text-muted-foreground">
            {agent.title || agent.role} · {String((agent.adapterConfig as Record<string, unknown> | null)?.model ?? "default model")} ·{" "}
            <span className="font-mono">{formatCents(agent.budgetMonthlyCents ?? 0)}</span> a month
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/agents/${agent.id}/instructions`}>All settings</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={props.onClose}>Close</Button>
        </div>
      </div>

      {entry?.error ? <p className="text-sm text-destructive">Could not read this agent's instructions: {entry.error}</p> : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" /> Tell {agent.name} what to do
        </h3>
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={EXAMPLE_REQUEST}
          rows={4}
          disabled={preview.isPending}
          aria-label={`Instructions for ${agent.name}`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Write it the way you'd brief a person. You'll see the exact change before anything is saved.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Add as</span>
            <Select value={manualTarget} onValueChange={(value) => setManualTarget(value as AgentStudioManualTarget)}>
              <SelectTrigger size="sm" aria-label="Where to add this">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_TARGETS.map((target) => (
                  <SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={props.aiConfigured ? "outline" : "default"}
              onClick={() => {
                setSteps(null);
                setProposal(manualRuleProposal(currentRules, manualTarget, request));
              }}
              disabled={!request.trim() || preview.isPending || !entry?.file}
            >
              Add rule
            </Button>
            {props.aiConfigured ? (
              <Button
                size="sm"
                onClick={() => preview.mutate()}
                disabled={!request.trim() || preview.isPending || !entry?.file}
              >
                {preview.isPending ? "AI is preparing…" : "Let AI sort it"}
              </Button>
            ) : null}
          </div>
        </div>
        {!props.aiConfigured ? (
          <p className="text-xs text-muted-foreground">
            AI sorting (splitting one request into rules and schedules) is off: no AI is connected on the server.
            "Add rule" works without it and the agent reads your words as written.
          </p>
        ) : null}
        {preview.error ? <p className="text-sm text-destructive">{errorMessage(preview.error)}</p> : null}
      </section>

      {proposal ? (
        <ProposalPreview
          proposal={proposal}
          currentRules={currentRules}
          blocked={blockingProblems.length > 0}
          applying={apply.isPending}
          onApply={() => apply.mutate({ proposal })}
          onCancel={() => setProposal(null)}
        />
      ) : null}

      {apply.error ? <p className="text-sm text-destructive">{errorMessage(apply.error)}</p> : null}
      {steps ? <ApplyResult steps={steps} /> : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Current rules</h3>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={!entry?.file}>Edit by hand</Button>
          ) : null}
        </div>
        {editing ? (
          <ManualRulesEditor
            initial={currentRules}
            saving={apply.isPending}
            onCancel={() => setEditing(false)}
            onSave={(rules) =>
              apply.mutate({
                proposal: { summary: "Manual edit", rules, scheduleChanges: [], enforcementNotes: [], warnings: [] },
              })
            }
          />
        ) : (
          <RulesView rules={currentRules} hasRules={entry?.hasRules ?? false} />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Schedules</h3>
          {!addingSchedule ? (
            <Button variant="outline" size="sm" onClick={() => setAddingSchedule(true)} disabled={!entry?.file}>Add schedule</Button>
          ) : null}
        </div>
        {addingSchedule ? (
          <AddScheduleForm
            onCancel={() => setAddingSchedule(false)}
            onPreview={(input) => {
              setSteps(null);
              setAddingSchedule(false);
              setProposal(manualScheduleProposal(currentRules, input));
            }}
          />
        ) : null}
        {statusChange.error ? <p className="text-sm text-destructive">{errorMessage(statusChange.error)}</p> : null}
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedules yet. Click "Add schedule" to give this agent a recurring task.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {schedules.map((routine) => {
              const trigger = scheduleOf(routine);
              const active = routine.status === "active";
              return (
                <li key={routine.id} className="py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <Link to={`/routines/${routine.id}`} className="truncate hover:underline">{routine.title}</Link>
                  <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
                    {trigger?.cronExpression ? describeSchedule(trigger.cronExpression) : "Not on a timer"}
                    {trigger?.timezone ? <span className="font-mono text-xs">{trigger.timezone}</span> : null}
                    <Badge variant="outline">{routine.status}</Badge>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={statusChange.isPending}
                      onClick={() => statusChange.mutate({ routineId: routine.id, status: active ? "paused" : "active" })}
                    >
                      {active ? "Pause" : "Resume"}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Card>
  );
}

function RulesView({ rules, hasRules }: { rules: AgentStudioRules; hasRules: boolean }) {
  if (!hasRules) {
    return (
      <p className="text-sm text-muted-foreground">
        No rules set in Agent Studio yet. The agent follows its existing instructions. Describe its job above, or edit by hand.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Job</span>
        <p className="text-sm whitespace-pre-wrap">{rules.job || "Not set."}</p>
      </div>
      {AGENT_STUDIO_RULE_SECTIONS.map((section) => (
        <div key={section.key} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{section.heading}</span>
          {rules[section.key].length ? (
            <ul className="list-disc pl-5 text-sm flex flex-col gap-0.5">
              {rules[section.key].map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <span className="text-sm text-muted-foreground">None.</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ManualRulesEditor(props: {
  initial: AgentStudioRules;
  saving: boolean;
  onSave: (rules: AgentStudioRules) => void;
  onCancel: () => void;
}) {
  const [job, setJob] = useState(props.initial.job);
  const [lists, setLists] = useState<Record<RuleListKey, string>>(() => ({
    alwaysDo: props.initial.alwaysDo.join("\n"),
    neverDo: props.initial.neverDo.join("\n"),
    askFirst: props.initial.askFirst.join("\n"),
    noApprovalNeeded: props.initial.noApprovalNeeded.join("\n"),
  }));
  const toList = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Job</span>
        <Textarea value={job} onChange={(e) => setJob(e.target.value)} rows={3} />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AGENT_STUDIO_RULE_SECTIONS.map((section) => (
          <label key={section.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{section.heading} · one per line</span>
            <Textarea
              value={lists[section.key]}
              onChange={(e) => setLists((prev) => ({ ...prev, [section.key]: e.target.value }))}
              rows={4}
              placeholder={SECTION_HINTS[section.key]}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel} disabled={props.saving}>Cancel</Button>
        <Button
          size="sm"
          disabled={props.saving}
          onClick={() =>
            props.onSave({
              job: job.trim(),
              alwaysDo: toList(lists.alwaysDo),
              neverDo: toList(lists.neverDo),
              askFirst: toList(lists.askFirst),
              noApprovalNeeded: toList(lists.noApprovalNeeded),
            })
          }
        >
          {props.saving ? "Saving…" : "Save rules"}
        </Button>
      </div>
    </div>
  );
}

function ProposalPreview(props: {
  proposal: AgentStudioProposal;
  currentRules: AgentStudioRules;
  blocked: boolean;
  applying: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { proposal } = props;
  const diff = useMemo(() => diffAgentStudioRules(props.currentRules, proposal.rules), [props.currentRules, proposal.rules]);
  const changedSections = diff.filter((s) => s.changed);
  return (
    <Card className="p-4 gap-4 bg-muted/40">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Preview · nothing has changed yet</span>
        <p className="text-sm">{proposal.summary}</p>
      </div>

      {proposal.warnings.length ? (
        <ul className="flex flex-col gap-1">
          {proposal.warnings.map((w) => (
            <li key={w} className="text-sm flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted-foreground">Rule changes</span>
        {changedSections.length === 0 ? <p className="text-sm text-muted-foreground">No rule changes.</p> : null}
        {changedSections.map((section) => (
          <div key={section.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">{section.heading}</span>
            <ul className="flex flex-col gap-0.5 text-sm">
              {section.lines.filter((l) => l.change !== "kept").map((line) => (
                <li
                  key={`${line.change}:${line.text}`}
                  className={cn(
                    "rounded px-2 py-0.5 whitespace-pre-wrap",
                    line.change === "added" ? "text-(--diff-add-fg) bg-(--diff-add-bg)" : "text-(--diff-remove-fg) bg-(--diff-remove-bg) line-through",
                  )}
                >
                  {line.change === "added" ? "+ " : "− "}
                  {line.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {proposal.scheduleChanges.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Schedule changes</span>
          <ul className="flex flex-col gap-1 text-sm">
            {proposal.scheduleChanges.map((change, index) => (
              <li key={`${change.action}-${change.title}-${index}`} className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{change.action === "create" ? "New" : change.action === "update" ? "Move" : "Pause"}</Badge>
                <span className="font-medium">{change.title}</span>
                {change.action !== "pause" ? (
                  <span className="text-muted-foreground">
                    {change.plainSchedule} <span className="font-mono text-xs">{change.cronExpression} {change.timezone ?? DEFAULT_TIMEZONE}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposal.enforcementNotes.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">How approvals are enforced</span>
          <ul className="flex flex-col gap-1 text-sm">
            {proposal.enforcementNotes.map((note) => (
              <li key={note.rule} className="flex flex-col">
                <span>
                  <Badge variant={note.enforcement === "needs_tool_setting" ? "secondary" : "outline"} className="mr-2">
                    {note.enforcement === "needs_tool_setting" ? "Also set a tool to Ask first" : "Agent follows this rule"}
                  </Badge>
                  {note.rule}
                </span>
                {note.explanation ? <span className="text-xs text-muted-foreground pl-1">{note.explanation}</span> : null}
              </li>
            ))}
          </ul>
          {proposal.enforcementNotes.some((n) => n.enforcement === "needs_tool_setting") ? (
            <p className="text-xs text-muted-foreground">
              For a hard stop, open <Link to="/apps" className="underline">Apps</Link>, pick the tool and set its action to "Ask first".
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel} disabled={props.applying}>Cancel</Button>
        <Button size="sm" onClick={props.onApply} disabled={props.applying || props.blocked}>
          {props.applying ? "Applying…" : props.blocked ? "Fix the warnings first" : "Apply changes"}
        </Button>
      </div>
    </Card>
  );
}

function ApplyResult({ steps }: { steps: AgentStudioApplyStep[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {steps.map((step) => (
        <li key={step.label} className="flex gap-2 items-start">
          {step.ok ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-(--diff-add-fg)" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
          )}
          <span>
            {step.label}
            {step.error ? <span className="text-destructive"> — {step.error}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AddScheduleForm(props: {
  onCancel: () => void;
  onPreview: (input: { title: string; description: string; cronExpression: string; timezone: string; plainSchedule: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("0 10 * * 1");
  const [validCron, setValidCron] = useState(true);
  const ready = title.trim().length > 0 && description.trim().length > 0 && validCron;
  return (
    <Card className="p-4 gap-3 bg-muted/40">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Name</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly stock check" maxLength={200} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">What the agent should do each time, in plain English</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Check stock by batch, list anything below the reorder level and send it to the Procurement Executive."
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">When ({DEFAULT_TIMEZONE})</span>
        <ScheduleEditor value={cron} onChange={setCron} onValidityChange={setValidCron} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!ready}
          onClick={() =>
            props.onPreview({
              title,
              description,
              cronExpression: cron,
              timezone: DEFAULT_TIMEZONE,
              plainSchedule: describeSchedule(cron),
            })
          }
        >
          Preview schedule
        </Button>
      </div>
    </Card>
  );
}
