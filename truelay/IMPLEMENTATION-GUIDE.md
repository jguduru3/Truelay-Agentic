# Truelay on Paperclip: Implementation Guide

Version 1.0 · 23 Nov 2026 · For the founder, the deputy and the setup person

What we are building, who does what, what data to prepare, how to go live, and how to know it works.

Companion guides: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) (install and import) and [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) (systems and "ask first").

---

## 1. What is in the box

The folder `truelay/truelay-paperclip` is a ready-to-import Paperclip company:

| Item | Count | Where |
|---|---|---|
| Company (mission, goals, org chart, department map) | 1 | `COMPANY.md` |
| AI agents (role cards as instructions) | 11 | `agents/<slug>/AGENTS.md` |
| SOP skills (3 company-wide + 25 department SOPs) | 28 | `skills/<slug>/SKILL.md` |
| Teams | 2 | `teams/revenue`, `teams/operations` |
| Projects | 9 | `projects/<slug>/PROJECT.md` |
| Routines (47 scheduled in IST + 1 cold-chain webhook) | 48 | `projects/*/tasks/<slug>/TASK.md` with `recurring: true` |
| Starter tasks | 9 | `projects/*/tasks/<slug>/TASK.md` |
| Paperclip settings: models, budgets, heartbeat off, permissions, env inputs, schedules | 1 | `.paperclip.yaml` |

It is generated from `truelay/tools/gen_package.py` and `truelay/tools/gen_skills.py`. To change an SOP permanently, edit those files and regenerate (deployment guide, section 9).

### The operating model in one picture

```
People (about 9)            decide, own relationships, do physical work
   ▲ approvals, brief            │ assign work, answer approvals
   │                             ▼
Paperclip: 11 agents     plan, draft, chase, check, report; ask before anything risky
   ▲ read                        │ draft writes (ask first)
   │                             ▼
Systems                  ERP · accounting · CRM · loggers · WhatsApp/email · shared drive
```

Agents cannot pay, refund above limits, send in bulk, submit to a portal, sign, or release food or a shipment without a human click.

## 2. The agents

| Agent | Model | Budget/month | Departments | Human checker |
|---|---|---|---|---|
| Chief of Staff (`ceo`) | Sonnet 5.5 | $40 | Leadership, routes all work | Founder |
| Finance Controller (`cfo`) | Sonnet 5.5 | $25 | 10, 16, 27, 33 | Founder or accountant |
| Supply Planner (`supply-planner`) | Sonnet 5.5 | $25 | 9, 13, 15, 24 | Procurement Executive |
| Ops and Quality (`ops-quality`) | Haiku 4.5 | $25 | 14, 17, 18, 19, 29, 32 | QC and floor lead |
| Customer Care (`customer-care`) | Haiku 4.5 | $20 | 1 | QC and floor lead |
| Export Desk (`export-desk`) | Sonnet 5.5 (high effort) | $25 | 30, 7 (export) | Rajesh |
| Revenue Lead (`revenue-lead`) | Sonnet 5.5 | $20 | 2, 5, 8, 21, 23 | Founder |
| B2B Sales Desk (`b2b-sales`) | Haiku 4.5 | $15 | 8 (B2B) | India B2B KAM; Harnika for data |
| B2C Growth (`b2c-growth`) | Haiku 4.5 | $15 | 23, 5, 8 (B2C) | Sandeep / Founder |
| Compliance and Legal (`compliance-legal`) | Sonnet 5.5 | $15 | 4, 7, 25 (records), 34 | Founder; lawyer for contracts |
| Analyst (`analyst`) | Sonnet 5.5 | $25 | 3, 6, 11, 12, 20, 22, 26, 28, 31 | Founder; Sri Kumar for tenders |
| **Total** | | **$250** | **All 34** | |

Every agent also has the three company-wide skills: `truelay-context`, `approval-gates`, `data-handling`. Paperclip warns at 80% of an agent's budget and pauses it at 100%.

Model note: the source documents say "Sonnet" and "Haiku". The package uses the newest of each that Paperclip's Claude adapter lists: `claude-sonnet-5-5` and `claude-haiku-4-5`. Change per agent on its **Configuration** page if you want.

## 3. The people

| Person | Keeps | Agents take off their plate | Works with |
|---|---|---|---|
| Founder (board) | Strategy; approvals on money, price, credit, shipments, hires | Daily reporting, chasing, compiling numbers | Chief of Staff |
| Deputy (board) | Backup approvals | Same | Chief of Staff |
| Rajesh | Export buyers: Dubai, Oman, Maldives | Document packs, tracking, follow-ups, quotes | Export Desk, B2B Sales |
| Sai | Maldives relationships | Same as Rajesh for Maldives | Export Desk |
| Harnika | Owner of export customer data | CRM upkeep, cleaning, reorder reminders | B2B Sales |
| Sri Kumar | Government relationships, tender go / no-go | Tender search, bid documents, billing follow-up | Analyst, Compliance and Legal |
| Procurement Executive | Placing orders, supplier calls, market visits | Buy plan, price comparison, landed cost | Supply Planner |
| QC and floor lead | Physical QC, holding and releasing batches | QC records, breach logs, yield reports | Ops and Quality |
| India B2B key account manager (to hire) | Face-to-face sales to hotels, hospitals, institutions | Lead lists, quotes, CRM updates, nudges | B2B Sales, Revenue Lead |

Sandeep stays on the MyGate pitch with B2C Growth. Processing, packing and delivery staff stay as they are; agents remove their paperwork, not their work.

**Paperclip accounts.** Board access: founder and deputy only. Everyone else who checks an agent's work gets a normal member account so they can read, comment on and be @-mentioned in tasks, and approve the items the matrix gives them (QC lead: held batch release; Harnika: customer data; Rajesh: shipment release together with the board).

## 4. A day at Truelay (IST)

| Time | Routine | Agent | People |
|---|---|---|---|
| 22:00 (night before) | Order cut-off | Customer Care, B2B Sales stop taking next-morning orders into the plan | — |
| 03:30 | Daily buy plan | Supply Planner | — |
| 04:00 | Buy plan lands | — | Procurement Executive orders and goes to market |
| Every 2 h from 00:00 | Cold-chain sweep | Ops and Quality | QC lead acts on breaches |
| Instant | Cold-chain sensor alert (webhook) | Ops and Quality | QC lead decides per batch |
| 08:00-22:00 hourly | Complaint sweep | Customer Care | — |
| 08:30 | Founder daily brief | Chief of Staff | Founder reads in 10 minutes, approves cards from phone |
| 08:45 | Ops huddle prep | Ops and Quality | 09:15 huddle uses the list |
| 10:00 Mon-Sat | Collections run | Finance Controller | Founder approves credit holds; account owners call |
| 11:00 Mon-Fri | Tender scan | Analyst | Sri Kumar reviews |
| 12:00 Mon-Sat | Export shipment watch | Export Desk | Rajesh / Sai talk to buyers about flags |
| 16:00 | Reorder nudges | B2B Sales Desk | Account owners send or call |
| Mon 09:30 | Pipeline review | Revenue Lead | Founder |
| Mon 10:00 | Compliance check | Compliance and Legal | Owners; board at 30 days |
| Tue 10:00 | B2C growth review | B2C Growth | Revenue Lead, Sandeep |
| Thu 11:00 | Cash and collections review | Finance Controller | Board |
| Fri 15:00 | Margin report | Analyst | Board |
| 2nd, 10:00 | Monthly business review | Chief of Staff | Board decides grow / fix / pause |
| 5th, 11:00 | Market and subsidy scan | Analyst | Board |
| 7 Jan/Apr/Jul/Oct, 10:00 | Quarterly product and strategy review | Chief of Staff | Board |

## 5. Master lists to prepare before go-live

Agents are only as good as the lists they read. Prepare these six before switching agents on.

| Master list | Lives in | Columns | Owner |
|---|---|---|---|
| Product list (SKU master) | ERP | Code, name, species, cut, form (fresh/frozen/liquid/boiled), pack size, channels, markets, brand family, cost (procurement, processing, packaging, channel), selling price per channel, shelf life, label claims, claim lab-verified, status (active / on request / inactive) | Analyst |
| Customer list | CRM | Name, segment, market, channel, contacts, GST, rate card, credit limit and terms, usual order days, owner, data consent (B2C) | Harnika / B2B Sales |
| Supplier list | ERP | Name, species, location, licences, price basis (market / farm-gate / trader / negotiated), payment terms, QC score, contract expiry | Supply Planner |
| Licence and certificate register | Shared drive | Item, authority, site or product, number, issue date, expiry, owner, renewal lead time, file link | Compliance and Legal |
| Contract register | Shared drive | Party, type, start, end, key terms, renewal date, file link | Compliance and Legal |
| Yield and QC standards | ERP or shared drive | Per cut: expected yield %, temperature limits, grade rules, reject rules | Ops and Quality |

Until each list is in its system, drop it as CSV under `data/` (integration guide, section 5). The starter tasks `build-sku-master`, `compliance-register`, `crm-migration` and `founder-dashboard` have the agents help build them.

## 6. Decisions to make before switching anything on

- [ ] Replace the starting thresholds in the `approval-gates` skill with your numbers (Paperclip → **Skills → approval-gates**).
- [ ] Name the deputy board member and give them board access.
- [ ] Answer the open questions in `truelay-context`: Mali vs Malé; buffalo and crab sourcing; egg brand names per market; boiled-egg packs; export egg codes.
- [ ] Mark each nutrition / health claim (25 g protein, Omega, Vitamin Plus) verified or not in the product list.
- [ ] Check the licence list in `compliance-calendar` with your CA and a food-regulatory consultant (it is a starting list, not legal advice).
- [ ] Confirm the model per agent and the budgets. Budgets are in USD cents (`budgetMonthlyCents`).
- [ ] Set target gross margins (starting values: B2B 15-20%, B2C 30-35%, export per contract) in `pricing-and-quotes`.
- [ ] Set the monthly B2C promo budget and the ad budget the Revenue Lead may not exceed.

## 7. Go-live: two ways, pick one

The two source documents disagree here. The Master Design starts everything paused and switches on in four waves. The Implementation Files switch everything on in one launch day with a first-week safety setting. Both are supported.

**Recommendation: the one-day launch, if all six master lists and at least accounting, ERP and CRM (or their CSV exports) are ready.** Otherwise use waves, and start Wave 1 while the data is being cleaned.

### Option 1: launch day, everything at once

Everything was imported paused. The whole runbook fits in one working day.

**Hour 1 — company and rules**

1. Confirm the import (deployment guide, section 5): 11 agents, 48 routines, all paused.
2. Founder and deputy are board members; "board approval for new agents" is on.
3. Thresholds in `approval-gates` are your numbers.
4. Anthropic monthly cap set; per-agent budgets checked on each agent's **Budget** tab.

**Morning — systems connected** (integration guide)

5. Accounting, ERP, CRM, cold-chain feed, WhatsApp/email, shared drive: connected, or their CSVs dropped under `data/`.
6. Every tool that pays, refunds, bulk-sends, submits to a portal, adjusts stock or releases a batch has a **require approval** policy.
7. First-week setting: **require approval** on every outbound customer message and every PO tool.

**Midday — knowledge loaded**

8. Skills, agents and projects already came with the import. Read each agent's role card once (Agents → agent → Instructions) and correct anything wrong.
9. Load the six master lists.
10. Point the cold-chain webhook at the routine (integration guide, section 4).

**Afternoon — switch on**

11. Resume all 11 agents (Agents page → each agent → **Resume**). Resume the 48 routines (Routines page).
12. Run every agent once by hand on a connection-test task (integration guide, section 6). Fix any failure the same day.
13. Assign the 9 starter tasks' first steps (they are already assigned; resuming the agents starts them).

**First night and morning**

14. 03:30: first buy plan. Check it reached the Procurement Executive by 04:00.
15. 08:30: first founder brief. Any number shown as "missing" = a system not connected. Fix it that day.
16. 09:15: first huddle uses the 08:45 misses-and-risks list.

**Day 8:** remove the first-week extra approval policies and the "First-week safety setting" paragraph in `approval-gates`.

### Option 2: four waves

| Wave | When | Resume these agents (and their routines) | Starter tasks | Why first |
|---|---|---|---|---|
| 1 | Week 1 | ceo, analyst, compliance-legal, cfo | resolve-source-gaps, build-sku-master, compliance-register, founder-dashboard | High value, low risk; builds the data the rest needs |
| 2 | Weeks 2-4 | export-desk, b2b-sales | crm-migration | Protects the customers you already have |
| 3 | Month 2 | supply-planner, ops-quality, customer-care | cold-chain-loggers | Needs clean ERP and SKU data |
| 4 | Months 2-3 | revenue-lead, b2c-growth | hire-india-b2b-kam, mygate-pilot, gem-registration | Growth once control is in place |

**Gate to the next wave:** the previous wave's routines ran for 5 working days with no missed output and no approval bypass.

In Wave 1 the founder brief will show many numbers as "missing" (no supply, ops or care agents yet). That is expected; the Chief of Staff lists them under **Missing**.

## 8. Approvals: how they work day to day

The full matrix is in the `approval-gates` skill. Summary:

| Action | Limit | Approver |
|---|---|---|
| Purchase order | Above Rs 2,00,000 or new supplier | Board |
| Price or rate-card change | More than 5% or new rate card | Board |
| Discount or promotion | Outside approved promo budget | Board |
| Credit limit / term / hold / release | Any | Board |
| Refund, credit note, coupon | Above Rs 2,000 per case or Rs 25,000 per day | Board |
| Any payment | Any (agents never pay) | Board |
| Held batch release | Any | QC and floor lead |
| Export shipment release | Every | Board + Rajesh |
| Customs / certifier / portal / tender submission | Every | Board |
| New or changed contract | Any | Board + lawyer |
| Price, credit or delivery promise to a new customer | Any | Human account owner |
| Bulk customer message | Above 500 recipients | Board |
| Export or sharing of customer data | Any | Harnika |
| New agent, budget, tool or connection | Any | Board |

How it is enforced:

- **In Paperclip itself:** agents raise a `request_board_approval` card on the task and wait in `in_review`. Board approval for new agents is required, and no agent can create agents.
- **At the tools:** connected tools that pay, refund, bulk-send, submit, adjust stock or release batches have **require approval** policies, so even a mistaken agent cannot run them without a click.
- **Approvals for people who are not the board** (QC lead, Harnika, Rajesh, account owners): the agent @-mentions them on the task and waits in `in_review`; the person replies or reassigns. Paperclip's approval cards are answered by board members, so for "Board + Rajesh" the board approves the card after Rajesh agrees on the task.

**How to approve from a phone:** open the Paperclip inbox. Each card says what, value, recommended action, checks done, risks and deadline. Approve or reject with a reason. Target: no card waits more than 4 hours; the Chief of Staff reminds the deputy at 4 hours.

## 9. Escalation rules

| Situation | Agent does | Escalates to | Within |
|---|---|---|---|
| Cold-chain breach or failed QC | Holds the batch | QC lead | Immediately |
| Complaint about illness or contamination | Holds the batch; no automatic reply | Ops and Quality + board | Immediately |
| Export document missing or certificate expiring before ship date | Stops the release request | Rajesh + board | Same day |
| Supplier price up more than 10% in a week | Prepares alternatives | Board | Same day |
| Account over 30 days overdue | Recommends credit hold | Board | Same day |
| Licence expiring within 30 days | Raises renewal task | Board | Same day |
| Routine did not run or a number is missing | Chief of Staff opens a task | System owner | By 10:00 |
| Approval waiting more than 4 hours | Chief of Staff reminds | Deputy board member | At 4 hours |
| Agent at 80% of monthly budget | Paperclip warns | Board | Automatic |
| Two agents disagree | Chief of Staff decides on the record | Board if money or food safety | Same day |

## 10. Cost

Starting AI budget: $250 a month (about Rs 21,000) for all 11 agents. What keeps it low:

- Timer heartbeats are off: agents only wake on a routine or an assignment.
- Haiku runs the frequent rule-based work (ops, care, B2B nudges, B2C).
- Each run is capped at 60 agent turns and 30 minutes (`maxTurnsPerRun`, `timeoutSec`).
- Paperclip pauses an agent at 100% of its budget.

The busiest routines are the hourly complaint sweep (15 runs a day) and the 2-hourly cold-chain sweep (12 a day), both on Haiku. The 47 scheduled routines cover every scheduled task in the Agent Task Breakdown (the draft POs run inside the buy plan, and the weekly margin report is one routine shared by Finance and the Analyst). Daily routines on Sonnet (founder brief, brief data, cash line, missed-routine check, buy plan) are the main cost; if Finance, the Analyst or the Chief of Staff nears 80% of budget, move its daily routine to Haiku or merge it into the founder brief run. Review the **Costs** page after week 1 and month 1. If an agent is consistently under 50% of budget, lower it; if a judgment agent hits 80% before day 20, look at its run logs before raising it.

Other running costs (yours to confirm): the server (deployment guide, section 2); existing ERP, CRM, accounting and WhatsApp Business subscriptions. Paperclip itself is free and open source.

## 11. How you know it is working

Check at day 7 and day 30.

| Measure | Target |
|---|---|
| Founder brief arrives by 08:30 with all 12 numbers | Every day |
| Buy plan arrives by 04:00 | Every day |
| Routines that ran without a miss | Above 95% |
| Approvals waiting more than 4 hours | Zero |
| Actions taken without a required approval | Zero |
| Complaints open more than 24 hours | Zero |
| Export shipments with a document error | Zero |
| Hours per week the founder spends chasing reports | Down by at least half |
| AI spend vs budget | Within $250 |

Where to look in Paperclip:

- **Dashboard**: every agent, open task and approval waiting.
- **Routines**: last run and next run per routine; a missed run shows here first.
- **Costs**: spend per agent vs budget.
- **Activity**: the permanent log of every action and decision. It doubles as evidence in food-safety and export audits.

## 12. Judging agent output

Good output is one screen, numbers against targets, only the exceptions explained, every red with an owner and next step, and approvals listed with their age. The **Sample Outputs** in the Truelay implementation files (founder brief, buy plan, shipment release card, monthly review, huddle note) are the standard. If an agent's output is less clear than those, correct its SOP skill the same day. That is the main way the system improves.

## 13. Worked examples: where the human clicks

| Situation | Agents do | Human approval |
|---|---|---|
| Hyderabad hotel orders 40 kg breast + 25 kg curry cut at 21:10 | B2B Sales logs it and checks credit; Supply Planner adds it to the 03:30 plan; Ops and Quality yields, labels, routes; Finance drafts reminders | None, unless the account is on hold, or 30 days overdue (board approves the hold) |
| Frozen mutton container to Dubai | Export Desk: spec sheet, proforma, document pack, release card with checklist; Finance confirms advance; Supply Planner books mutton | Rajesh confirms price; PO above limit (board); shipment release (board + Rajesh); customs submission (board) |
| Cold room at 9 °C for 50 minutes after a power trip | Ops and Quality holds batches at once, records, alerts; Supply Planner re-plans; Chief of Staff shows it red in the brief | QC lead decides per batch |
| B2C fish freshness complaint, Rs 640 | Customer Care logs, checks the batch, refunds within limit, tags the cause | None (under Rs 2,000). Illness would mean hold + board + a person calls |
| State GeM egg tender | Analyst finds it; Compliance qualifies; Finance works margin and cash; Revenue Lead proposes price | Sri Kumar + board go/no-go; board approves price and guarantee; Sri Kumar submits |
| Chicken price up 14% in five days | Supply Planner flags and proposes options; Analyst shows margin hit; Revenue Lead proposes rate-card change; B2B Sales drafts notices | Board chooses option and approves price change; account owners send notices |

## 14. What we changed in Paperclip, and what is left

**Changed in this repository**

- `paperclipai company import --pause-automations`: the CLI can now import a company with every agent and routine paused, matching the web UI's default. Without it, a CLI import would start the 03:30 buy plan before the data is ready. Code: `cli/src/commands/client/company.ts`; tests: `cli/src/__tests__/company.test.ts`.
- **Agent Studio** (sidebar → *Agent Studio*, super admins only): one screen showing all agents, with a panel per agent for its job and four rule lists: *Always do*, *Never do*, *Ask the board first*, *No approval needed*. Write a change in plain English and AI shows a preview: rule changes, new or moved schedules, and whether each approval rule is followed by the agent or also needs a tool set to "Ask first". Nothing changes until you click **Apply**. Apply saves the rules into the agent's `AGENTS.md` (between `agent-studio:rules` markers, with full revision history) and creates or changes routines. You can also edit the rules by hand without AI. The AI preview needs `ANTHROPIC_API_KEY` on the server (optional `AGENT_STUDIO_MODEL`, default `claude-sonnet-5-5`). Every preview is recorded in the Activity log. Starting rules for all 11 agents come from the Agent Task Breakdown (`STUDIO_RULES` in `tools/gen_package.py`). Code: `ui/src/pages/AgentStudio.tsx`, `server/src/routes/agent-studio.ts`, `packages/shared/src/agent-studio.ts`.

**Covered by configuration, no code needed**

- Cold-chain instant alert: a webhook-triggered routine (integration guide, section 4).
- Ask-first tools: tool gateway **require approval** policies (integration guide, section 3).
- Approval thresholds: in the `approval-gates` skill, applied by the agents and backed by tool policies.

**Backlog, build only if usage proves the need**

1. Truelay connectors: small read-only MCP servers for Tally, the ERP and the logger feed (integration guide, section 7).
2. Threshold-aware approval routing: automatically approve-and-log below a limit (for example refunds under Rs 2,000) and route above it to the board. Today agents apply the thresholds from the skill and tool policies enforce the hard stops; trust rules cover repeated identical actions.
3. Named non-board approvers (QC lead, Harnika, Rajesh) as first-class approval participants. Today they confirm on the task and the board clicks the card.
4. WhatsApp board inbox: push approval cards to the founder's phone.
5. Per-market dashboards: a page per project showing the 12 numbers filtered by market.
