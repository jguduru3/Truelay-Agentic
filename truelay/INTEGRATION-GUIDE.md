# Truelay on Paperclip: Integration Guide

Version 1.0 · 23 Nov 2026 · For the setup person

How the 11 agents reach Truelay's systems, in what order to connect them, and how to make every risky tool "ask first".

Start with [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) (Paperclip running, Truelay imported). The people and launch plan are in [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md).

---

## 1. Three ways an agent reaches a system

| Level | How it works | Use it when |
|---|---|---|
| **0. Files (day one)** | People drop CSV/XLSX exports under the project workspace `data/<system>/` or attach them to the task. Agents read the newest file and state its date (skill `data-handling`). | Before a system is connected, or while its data is being cleaned. |
| **1. Tool connection from the Apps catalog** | **Apps** page → add a connection → pick which agents may use it. Calls go through Paperclip's tool gateway, which applies policies, approvals and the audit log. | The system is in the catalog, or reachable through Composio, Zapier, Make or Arcade (all in the catalog). |
| **2. Your own small MCP server** | A small read-only service that exposes the system as MCP tools, added as a connection. Write tools are added later, each behind a **require approval** policy. | Systems with no catalog option (Tally Prime, your cold-chain platform, an ERP with a custom API). |

Prefer level 1 over custom code. Only tool calls that go through the gateway get approvals, policies and audit. Do not give agents raw API tokens for systems that can move money or send messages: a raw token in an agent's environment bypasses the gateway.

The `.paperclip.yaml` declares optional environment inputs per agent (`ERP_API_URL`, `CRM_API_TOKEN`, and so on). Use them only for **read-only** access where no gateway connection exists yet. Leave them empty otherwise.

## 2. Connection order

Connect one system at a time. Each step is done when one hand-run test task per agent that uses it succeeds (section 6).

| Order | System | Suggested tool | Path | Agents | Ask-first tools |
|---|---|---|---|---|---|
| 1 | Accounting | Zoho Books (via Composio/Zapier) or Tally Prime (custom MCP over the Tally XML/ODBC gateway); Xero is in the catalog | 1 or 2 | cfo, analyst, b2b-sales (credit status, read) | Payments, credit notes, write-offs, invoice send |
| 2 | ERP: orders, stock, batches, expiry | Zoho Inventory, Odoo or ERPNext | 1 (Composio/Zapier/Make) or 2 | supply-planner, ops-quality, export-desk, analyst, customer-care (read), ceo (read) | Stock adjustments, batch release, PO create |
| 3 | CRM | Zoho CRM, HubSpot (Arcade in catalog) or Odoo CRM | 1 | b2b-sales, revenue-lead, b2c-growth, customer-care, export-desk | Bulk export, bulk send, contact delete |
| 4 | Cold-chain feed | Data loggers / IoT platform | Webhook + read feed | ops-quality | None (read-only) |
| 5 | Messaging | WhatsApp Business API (via Composio/Zapier or the provider's API), Gmail | 1 | customer-care, b2b-sales, b2c-growth | Every outbound send (first week), then sends to new contacts and bulk sends |
| 6 | Shared drive | Google Drive (catalog) / SharePoint | 1 | compliance-legal, export-desk | Sharing outside the company |
| 7 | Dashboards | Looker Studio or Metabase; Google Sheets (catalog) as the simple option | 1 | analyst | None |

Government portals (GeM, state tender portals, customs, certifiers): **no write connection at all**. Agents may read public tender listings. People submit.

## 3. Make risky tools "ask first"

For every connection, after adding it:

1. **Apps → the connection → Agents**: tick only the agents in the table above.
2. **Apps → the connection → Tools**: every write tool (Paperclip marks tools without a read-only hint as write) requires approval by default. Keep that default.
3. Add an explicit **require approval** policy for each tool in the "Ask-first tools" column, even if the provider marks it read-only.
4. Add a **block** policy for tools no agent should ever call: payments, bank transfers, deleting records, sharing publicly.

When an agent calls an ask-first tool, the gateway opens an action request and the agent's call waits. The board sees it in the Paperclip inbox. After approval the agent retries the same call with the same arguments; if the arguments changed, the call fails and needs a new approval.

**Trust rules.** After the first week, a repeated safe action (for example the Rs 640 refund pattern, or sending the standard day-1 reminder template) can be promoted to a trust rule from the approval. A trust rule only matches the exact argument shape that was approved, so it cannot widen silently.

**First-week setting.** For the first 7 days, put **require approval** on every outbound message tool and every PO tool regardless of size (also stated in the `approval-gates` skill). On day 8, remove the extra policies and delete the "First-week safety setting" paragraph from the `approval-gates` skill.

## 4. The cold-chain instant alert (no code needed)

The import created a routine **Cold-chain sensor alert** (`cold-chain-alert`) with a webhook trigger, assigned to Ops and Quality. When the logger platform calls it, Paperclip creates an urgent task and wakes Ops and Quality at once, instead of waiting for the 2-hourly sweep.

1. **Routines → Cold-chain sensor alert → Triggers → Webhook → Rotate secret.** The import cannot carry secret material, so rotate once to get the webhook URL and secret. Copy both now; the secret is shown only once.
2. Turn on **setup / test mode** for the trigger. Test deliveries are recorded but do not start the routine.
3. In the logger platform, add an alert webhook:
   - URL: the webhook URL (it uses `PAPERCLIP_PUBLIC_URL`, so it must be the HTTPS address)
   - Header: `Authorization: Bearer <webhook secret>`
   - Body: JSON with at least `sensor`, `location`, `reading_c`, `limit_c`, `started_at`
4. Send a test alert. Check the trigger shows "test received".
5. Turn test mode off. Send one more test from the platform during a quiet hour and check an urgent task appears for Ops and Quality within a minute.

If the logger platform cannot send custom headers, use a small relay (Zapier, Make or a 20-line script) that adds the header.

Test from a terminal:

```bash
curl --fail-with-body "$WEBHOOK_URL" -H "Authorization: Bearer $WEBHOOK_SECRET" -H "Content-Type: application/json" -d '{"sensor":"CR-1","location":"Cold room 1","reading_c":9.0,"limit_c":4,"started_at":"2026-11-24T02:40:00+05:30"}'
```

## 5. Working from files until a system is connected

Folder convention inside each project workspace (or attach the file to the task):

```
data/
  erp/          stock-YYYY-MM-DD.csv, orders-YYYY-MM-DD.csv, batches-YYYY-MM-DD.csv, yields.csv
  accounting/   receivables-YYYY-MM-DD.csv, cash-YYYY-MM-DD.csv
  crm/          customers.csv (no phone numbers or emails for export buyers)
  coldchain/    loggers-YYYY-MM-DD.csv
  compliance/   register.csv, contracts.csv
  products/     sku-master.csv
  suppliers/    suppliers.csv
```

Rules: date in the file name; never edit a source file; a daily routine flags any file older than 24 hours as stale. Agents use the system as soon as it is connected and stop reading old files.

The column lists each agent expects are in the implementation guide, section 5 ("Master lists").

## 6. Test each connection

For every agent that uses a newly connected system, create a task assigned to that agent:

> **Connection test: <system>.** Read <one specific record, e.g. today's stock for SKU CH-BL-1KG>. Post the value, its source and time. Do not change anything.

Pass: the agent posts the right value with source and time, and the run shows the tool call in the run log. For a system with write tools, also ask the agent to *propose* one write (for example a draft PO) and check that an approval appears instead of the write happening.

## 7. Building a custom MCP server (Tally, ERP or loggers)

Keep it small and read-only first:

- One tool per question the SOPs ask: `get_stock(sku, location)`, `get_receivables(min_days_overdue)`, `get_batch(batch_code)`, `get_logger_readings(since)`, `list_open_shipments()`.
- Return JSON with a `source` and `as_of` timestamp so agents can quote them.
- Mark read tools with `readOnlyHint: true`.
- Add write tools later, one at a time (`create_draft_po`, `hold_batch`), and give each a **require approval** policy before any agent can use it. `hold_batch` is the one exception the SOPs allow without approval: holding is always safe; releasing is never done by an agent.
- Host it next to Paperclip, reachable only from the Paperclip server.

The full procedure for adding a connection is in `doc/connections/CONNECTOR-PLAYBOOK.md` in this repository.

## 8. Who owns each integration

| System | Business owner | Approves new agent access |
|---|---|---|
| Accounting | Founder / accountant | Board |
| ERP | Procurement Executive + QC lead | Board |
| CRM | Harnika (export data), India B2B KAM | Harnika for any export or sharing |
| Cold-chain loggers | QC and floor lead | Board |
| WhatsApp / email | Founder | Board |
| Shared drive | Founder | Board |

A new connection or new agent access to a connection always needs board approval (`approval-gates`).
