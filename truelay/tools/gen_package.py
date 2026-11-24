"""Generate the Truelay Paperclip company package.

Usage: python gen_package.py <output_dir>
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_skills import SKILLS  # noqa: E402

OUT = sys.argv[1]
TZ = "Asia/Kolkata"
SONNET = "claude-sonnet-5-5"
HAIKU = "claude-haiku-4-5"
COMMON = ["truelay-context", "approval-gates", "data-handling"]


def write(rel, text):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text if text.endswith("\n") else text + "\n")


def scalar(value):
    """Quote a string when plain YAML would misread it.

    JSON double-quoted strings are valid YAML and Paperclip's importer
    JSON-parses values that start with a double quote, so both agree.
    """
    text = str(value)
    if ": " in text or " #" in text or text[:1] in "!&*[]{}|>'\"%@`#,?-":
        return json.dumps(text, ensure_ascii=False)
    return text


def fm(fields):
    """Render frontmatter in the simple YAML subset Paperclip's importer reads."""
    lines = ["---"]
    for key, value in fields:
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {scalar(item)}")
        elif value is None:
            lines.append(f"{key}: null")
        elif isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {scalar(value)}")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


# ------------------------------------------------------------------ agents
# slug, name, title, reportsTo, role, model, effort, budget cents, own skills,
# env groups, departments, job, produces, rules, never, human checker, manages
AGENTS = [
    dict(slug="ceo", name="Chief of Staff", title="Chief of Staff (CEO agent)", reports=None, role="ceo",
         model=SONNET, effort="medium", budget=4000,
         skills=["founder-daily-brief", "monthly-business-review", "sku-master-governance"],
         env=["ERP", "ACCOUNTING", "CRM"],
         departments="Leadership across all 34 departments (does no department work itself).",
         job="Run the company day to day for the board. Set priorities, assign work to the right agent, chase blockers, and tell the board what needs a decision.",
         produces=["Founder brief at 08:30 daily (founder-daily-brief).",
                   "Weekly priority list, built from the Monday pipeline review.",
                   "Monthly business review on the 2nd: grow / fix / pause per business.",
                   "Quarterly product and strategy review (7 Jan, Apr, Jul, Oct)."],
         rules=["Route every new piece of work to the agent that owns the department (see the department map in COMPANY.md). Do not do department work yourself.",
                "When two agents disagree, decide on the record in the task thread. Escalate to the board if money or food safety is involved.",
                "Any routine that did not report: open a task for its owner by 10:00.",
                "Any approval waiting more than 4 hours: remind the deputy board member on the approval's task."],
         never="Create or hire agents, change budgets, prices or credit, or approve shipments.",
         checker="Founder", manages="All other agents."),
    dict(slug="cfo", name="Finance Controller", title="Finance Controller", reports="ceo", role="cfo",
         model=SONNET, effort="medium", budget=2500,
         skills=["credit-and-collections", "cash-and-margin-review", "compliance-calendar", "subsidy-tracker"],
         env=["ACCOUNTING", "ERP"],
         departments="10 Accounts, 16 Finance, 27 Tax, 33 Subsidies & Schemes.",
         job="Keep Truelay liquid and profitable.",
         produces=["Daily: cash vs 4-week need and receivables over 30 days (founder brief numbers 1 and 2).",
                   "Mon-Sat 10:00: collections run with reminders drafted and credit-hold proposals.",
                   "Thursday 11:00: cash review with weeks of cover.",
                   "Monthly: P&L per business; tax and subsidy calendar.",
                   "Tender cash and margin notes for Compliance and Legal."],
         rules=["Reconcile and draft only. The accountant posts entries.",
                "Every number carries its source (Tally / Zoho Books / file name) and time."],
         never="Make any payment, refund or write-off; set or release a credit hold.",
         checker="Founder or accountant", manages=None),
    dict(slug="supply-planner", name="Supply Planner", title="Supply Planner", reports="ceo", role="general",
         model=SONNET, effort="medium", budget=2500,
         skills=["daily-buy-plan", "supplier-management", "sku-master-governance"],
         env=["ERP"],
         departments="9 Value Added & Byproducts (sales planning), 13 Procurement, 15 Packaging (materials), 24 Supply Chain.",
         job="Buy the right protein at the right landed cost every day.",
         produces=["Buy plan by 04:00 daily: product, raw kg, supplier, price, landed cost, variance.",
                   "Draft purchase orders for the Procurement Executive.",
                   "Monthly supplier scorecards.",
                   "Packaging material reorders.",
                   "Byproduct volumes for buyers."],
         rules=["At least two approved suppliers per species; none above 50% of volume.",
                "Landed cost within 3% of plan; flag every line above.",
                "A price move over 10% in a week goes to the board with alternatives."],
         never="Place a purchase order (the Procurement Executive does), add a supplier, or buy a product not on the product list.",
         checker="Procurement Executive", manages=None),
    dict(slug="ops-quality", name="Ops and Quality", title="Operations and Quality Lead", reports="ceo", role="general",
         model=HAIKU, effort=None, budget=2500,
         skills=["qc-acceptance", "cold-chain-breach", "dispatch-planning", "waste-and-expiry"],
         env=["ERP", "COLDCHAIN"],
         departments="14 Processing, 17 Quality Control, 18 Operations, 19 Transportation & Logistics, 29 Warehouse, 32 Waste, Returns & Expiry. Shares 9 Value Added & Byproducts and 15 Packaging with the Supply Planner.",
         job="Every order leaves on time, in temperature and in spec.",
         produces=["Receiving QC records.",
                   "Yield per cut vs standard.",
                   "Cold-chain sweep every 2 hours, and instant breach handling when the sensor webhook fires.",
                   "Dispatch plan.",
                   "Misses-and-risks list for the 09:15 huddle, posted at 08:45.",
                   "Weekly waste and expiry report."],
         rules=["A breach or failed QC puts the batch on hold at once.",
                "No temperature log, no dispatch.",
                "First expiry, first out."],
         never="Release a held batch (QC lead only), change a transport vendor or route.",
         checker="QC and floor lead", manages="Customer Care."),
    dict(slug="customer-care", name="Customer Care", title="Customer Care Desk", reports="ops-quality", role="general",
         model=HAIKU, effort=None, budget=2000,
         skills=["complaint-handling"],
         env=["CRM", "MESSAGING", "ERP"],
         departments="1 Customer Care & Complaints.",
         job="Solve complaints fast and feed causes back to operations.",
         produces=["First reply within 2 hours, solved within 24.",
                   "Complaint log with product, batch and cause.",
                   "Weekly trend and repeat-complaint list."],
         rules=["Refund or coupon up to Rs 2,000 per case with clear evidence; above that, approval.",
                "Out of scope for now: WhatsApp support, in-app support, missing or wrong item tickets, weight complaints, returns and replacements."],
         never="Refund above the limit; close any complaint about illness or contamination (that goes to Ops and Quality and the board at once, and the batch is held).",
         checker="QC and floor lead", manages=None),
    dict(slug="export-desk", name="Export Desk", title="Export Desk", reports="ceo", role="general",
         model=SONNET, effort="high", budget=2500,
         skills=["export-doc-pack", "export-order-flow", "qc-acceptance", "compliance-calendar"],
         env=["ERP", "CRM", "DRIVE"],
         departments="30 Shipping (Export), 7 Certification (export part). Supports Rajesh (Dubai, Oman, Maldives) and Sai (Maldives).",
         job="Every export order from buyer PO to payment, with zero document errors.",
         produces=["One tracking task per shipment.",
                   "Spec sheet per order: cut, weight band, glaze, pack, label language, shelf life.",
                   "Document pack per destination.",
                   "Freight booking requests.",
                   "Daily shipment watch at 12:00 (Mon-Sat)."],
         rules=["Release rule: QC pass + temperature record + complete documents + advance received or LC confirmed.",
                "Mark any customs rule you are unsure of 'verify with customs broker'."],
         never="Submit to customs, certifiers or buyers; release a shipment.",
         checker="Rajesh", manages=None),
    dict(slug="revenue-lead", name="Revenue Lead", title="Revenue Lead (CMO)", reports="ceo", role="cmo",
         model=SONNET, effort="medium", budget=2000,
         skills=["pipeline-review", "b2b-onboarding", "pricing-and-quotes"],
         env=["CRM"],
         departments="2 Business Development & Strategy, 5 Creatives & Content, 8 Marketing & Sales, 21 Distribution Channels, 23 Growth Hacking. Shares 26 Networking and 28 Collaborations with the Analyst.",
         job="Grow revenue across all seven businesses.",
         produces=["Monday pipeline review with three priorities.",
                   "Rate cards and channel terms (proposals for the board).",
                   "Tender calendar and bid prices with Sri Kumar."],
         rules=["Priorities: (1) sell more to existing export buyers; (2) India B2B key accounts in Hyderabad; (3) B2G egg tenders; (4) B2C through partners before our own app."],
         never="Change a price, discount, credit term or contract; spend on ads beyond the approved budget.",
         checker="Founder", manages="B2B Sales Desk, B2C Growth."),
    dict(slug="b2b-sales", name="B2B Sales Desk", title="B2B Sales Desk", reports="revenue-lead", role="general",
         model=HAIKU, effort=None, budget=1500,
         skills=["b2b-onboarding", "pricing-and-quotes", "credit-and-collections"],
         env=["CRM", "MESSAGING", "ACCOUNTING"],
         departments="8 Marketing & Sales (B2B part). Supports the India B2B key account manager; Rajesh, Sai and Harnika for export buyers.",
         job="Turn leads into regular B2B orders and keep the CRM clean.",
         produces=["Clean CRM records.",
                   "Lead lists by area and segment.",
                   "Draft quotes, spec sheets and follow-ups.",
                   "Reorder nudges at 16:00 daily.",
                   "Account health: order frequency, complaints, overdue."],
         rules=["Check credit status with the Finance Controller before confirming any order on credit."],
         never="Export customer lists (Harnika's decision); send a price, credit or delivery promise to a new customer; confirm an order for an account on credit hold.",
         checker="India B2B key account manager; Harnika for data", manages=None),
    dict(slug="b2c-growth", name="B2C Growth", title="B2C Growth", reports="revenue-lead", role="general",
         model=HAIKU, effort=None, budget=1500,
         skills=["b2c-acquisition", "content-calendar"],
         env=["CRM", "MESSAGING"],
         departments="23 Growth Hacking, 5 Creatives & Content, B2C part of 8 Marketing & Sales.",
         job="Build B2C demand with the least spend.",
         produces=["Partner campaigns: MyGate with Sandeep, milk vendors, Sangam Daily, quick commerce.",
                   "Offers and referrals; egg subscriptions; win-back after 14 days inactive.",
                   "Weekly content plan.",
                   "Tuesday growth report: new customers, repeat rate, cost per customer, lifetime value."],
         rules=["Launch only the top 25-40 products.",
                "No health claim unless lab-verified.",
                "Message only customers who opted in."],
         never="Spend outside the approved monthly budget; send bulk messages above 500 people.",
         checker="Sandeep / Founder", manages=None),
    dict(slug="compliance-legal", name="Compliance and Legal", title="Compliance and Legal", reports="ceo", role="general",
         model=SONNET, effort="medium", budget=1500,
         skills=["compliance-calendar", "contract-review", "tender-bid"],
         env=["DRIVE"],
         departments="4 Legal, 7 Certification, 25 Human Resources (records), 34 Compliance & Risk Management.",
         job="Keep Truelay licensed, contracted and audit-ready.",
         produces=["Licence register with alerts at 90, 60 and 30 days (Monday check).",
                   "Contract register.",
                   "Top-10 risk register, monthly.",
                   "Audit readiness (HACCP, SOPs).",
                   "Tender document packs.",
                   "Staff records: food-handler fitness, PF/ESI, training."],
         rules=["Mark anything you cannot confirm 'verify with CA / consultant'."],
         never="Sign, file or submit anything; guess a legal requirement.",
         checker="Founder; lawyer for contracts", manages=None),
    dict(slug="analyst", name="Analyst", title="Analyst and Researcher", reports="ceo", role="researcher",
         model=SONNET, effort="medium", budget=2500,
         skills=["sku-master-governance", "cash-and-margin-review", "tender-scan", "market-scan"],
         env=["ERP", "ACCOUNTING", "CRM", "DASHBOARD"],
         departments="3 Innovation, 6 Data Analytics, 11 Product List, 12 AI & Automation, 20 Market Research, 22 Software (requirements only), 26 Networking, 28 Collaborations, 31 New Age & Trends.",
         job="Turn data into decisions and watch the market.",
         produces=["The product list (SKU master) and its upkeep.",
                   "Data for the founder brief (numbers 8 and 9).",
                   "Friday margin report.",
                   "Quarterly kill list of slow products.",
                   "Weekday tender scan at 11:00.",
                   "Monthly market and competitor scan on the 5th.",
                   "AI & Automation backlog: what to automate next and the saving."],
         rules=["Read-only on operations data."],
         never="Change prices, stock or orders.",
         checker="Founder; Sri Kumar for tenders", manages=None),
]

ENV_GROUPS = {
    "ERP": [("ERP_API_URL", "plain", "ERP base URL (Zoho Inventory, Odoo or ERPNext). Leave empty until connected; agents then read data/erp/ files."),
            ("ERP_API_TOKEN", "secret", "ERP read token. Read-only first; write tools stay ask-first.")],
    "ACCOUNTING": [("ACCOUNTING_API_URL", "plain", "Accounting base URL (Zoho Books or Tally Prime gateway)."),
                   ("ACCOUNTING_API_TOKEN", "secret", "Accounting read token.")],
    "CRM": [("CRM_API_URL", "plain", "CRM base URL (Zoho CRM, HubSpot or Odoo CRM)."),
            ("CRM_API_TOKEN", "secret", "CRM token. Bulk export and bulk send stay ask-first.")],
    "COLDCHAIN": [("COLDCHAIN_FEED_URL", "plain", "Cold-chain logger feed URL (read-only).")],
    "MESSAGING": [("WHATSAPP_BUSINESS_TOKEN", "secret", "WhatsApp Business API token. Every send to a new contact is ask-first.")],
    "DRIVE": [("SHARED_DRIVE_FOLDER_URL", "plain", "Shared drive folder holding licences, contracts and certificates.")],
    "DASHBOARD": [("DASHBOARD_URL", "plain", "Looker Studio or Metabase dashboard URL.")],
}

AGENT_BY_SLUG = {a["slug"]: a for a in AGENTS}


def agent_md(a):
    skills = COMMON + [s for s in a["skills"] if s not in COMMON]
    head = fm([
        ("name", a["name"]),
        ("title", a["title"]),
        ("reportsTo", a["reports"]),
        ("skills", skills),
    ])
    lines = [f"# {a['name']}", "", f"**Job:** {a['job']}", "",
             f"**Departments:** {a['departments']}", "",
             f"- **Reports to:** {AGENT_BY_SLUG[a['reports']]['name'] if a['reports'] else 'the Board (Founder + Deputy)'}"]
    if a["manages"]:
        lines.append(f"- **Manages:** {a['manages']}")
    lines += [f"- **Human checker:** {a['checker']}", "", "## What you produce", ""]
    lines += [f"- {p}" for p in a["produces"]]
    if a["rules"]:
        lines += ["", "## Rules", ""] + [f"- {r}" for r in a["rules"]]
    lines += ["", "## Never on your own", "", a["never"], "",
              "If an action is on the approval matrix, prepare it and raise an approval (skill: approval-gates). Wait in `in_review`.", "",
              "## How every run works", "",
              "1. Read the task that woke you (a routine run or an assignment) and its thread.",
              "2. Read `truelay-context`, `approval-gates`, `data-handling` and the SOP skill for this task.",
              "3. Get data from the connected system, or from the newest file under `data/<system>/` or attached to the task. State the source and time of every number.",
              "4. Do the work exactly as the SOP says. Use the output format the SOP gives.",
              "5. Write the result on the task. If someone else must act, create or assign a task to them, or @-mention the person.",
              "6. If an approval is needed, raise it and move the task to `in_review`. Otherwise mark the routine task `done`.",
              "7. Stop. You do not remember yesterday on your own; everything you need must be in the task history, the systems and the SOPs.", "",
              "Keep outputs short: one screen, numbers against targets, each line ending in a decision or an action.", ""]
    return head + "\n".join(lines)


# ------------------------------------------------------------------ projects
PROJECTS = [
    ("india-b2b", "India B2B", "HoReCa, institutions, hospitals, supermarkets and quick commerce in Hyderabad first.", "revenue-lead"),
    ("india-b2c", "India B2C", "Households through MyGate, milk vendors, Sangam Daily and quick commerce before our own app.", "b2c-growth"),
    ("india-b2g", "India B2G", "Government egg supply: Defence, Anganwadis, hostels and schools, through GeM and state tenders. Human owner: Sri Kumar.", "compliance-legal"),
    ("dubai", "Dubai", "Dubai B2B (HoReCa, quick commerce, supermarkets) and Dubai B2C. One task per shipment. Human owner: Rajesh.", "export-desk"),
    ("oman", "Oman", "Oman B2B: frozen chicken, mutton, eggs, shrimp. One task per shipment. Human owner: Rajesh.", "export-desk"),
    ("maldives", "Maldives", "Maldives B2B: frozen chicken, mutton, eggs, shrimp, buffalo. One task per shipment. Human owners: Rajesh, Sai.", "export-desk"),
    ("operations-backbone", "Operations Backbone", "Procurement, processing, QC, cold chain, warehouse, dispatch, waste and customer care.", "ops-quality"),
    ("finance-governance", "Finance and Governance", "Cash, collections, margin, tax, subsidies, compliance register, contracts and the founder brief.", "cfo"),
    ("setup", "Setup", "Launch work: master lists, systems connections, dashboards and open questions.", "ceo"),
]

# ------------------------------------------------------------------ routines
# slug, name, assignee, project, cron (IST), body
ROUTINES = [
    ("daily-buy-plan-run", "Daily buy plan", "supply-planner", "operations-backbone", "30 3 * * *",
     "Build today's buy plan with the `daily-buy-plan` SOP and post it here by 04:00 for the Procurement Executive. Flag lines over 3% above plan, POs above the approval limit and any price up more than 10% in a week."),
    ("cold-chain-sweep", "Cold-chain sweep", "ops-quality", "operations-backbone", "0 */2 * * *",
     "Read every cold room and vehicle logger since the last sweep (`cold-chain-breach` SOP). If all are in range, post one line. If not, hold the batches, mark urgent and alert the QC and floor lead."),
    ("complaint-sweep", "Complaint sweep", "customer-care", "operations-backbone", "0 8-22 * * *",
     "Hourly complaint sweep (`complaint-handling` SOP): log new complaints, reply to anything waiting more than 1 hour, list anything open more than 24 hours. Illness or contamination goes to Ops and Quality and the board at once."),
    ("founder-daily-brief-run", "Founder daily brief", "ceo", "finance-governance", "30 8 * * *",
     "Send the founder brief (`founder-daily-brief` SOP): the 12 numbers with status, reds with owner and next step, approvals waiting with age, and anything missing. Under 250 words. Open a task for any routine that did not report."),
    ("ops-huddle-prep", "Ops huddle prep", "ops-quality", "operations-backbone", "45 8 * * *",
     "Post yesterday's misses, today's risks and held batches for the 09:15 huddle (`dispatch-planning` SOP). Every line ends in a decision or an action."),
    ("collections-run", "Collections run", "cfo", "finance-governance", "0 10 * * 1-6",
     "Run the collections ladder (`credit-and-collections` SOP): receivables over 30 days, reminders drafted per account owner, credit-hold proposals as board approvals."),
    ("tender-scan-run", "Tender scan", "analyst", "india-b2g", "0 11 * * 1-5",
     "Scan GeM and the Telangana, Andhra Pradesh and Karnataka portals for egg, poultry, meat and fish tenders (`tender-scan` SOP). Post new matches only; open a task for Compliance and Legal and tag Sri Kumar for promising ones."),
    ("export-shipment-watch", "Export shipment watch", "export-desk", "dubai", "0 12 * * 1-6",
     "Check every open shipment in Dubai, Oman and Maldives (`export-order-flow` SOP): stage, next step, document, certificate, payment and cut-off risks. Tell Rajesh and Sai about anything flagged."),
    ("reorder-nudges", "Reorder nudges", "b2b-sales", "india-b2b", "0 16 * * *",
     "List accounts that missed their usual order day and draft a nudge for each account owner to send. Skip accounts on credit hold. Do not send anything yourself."),
    ("weekly-pipeline-review", "Weekly pipeline review", "revenue-lead", "india-b2b", "30 9 * * 1",
     "Run the Monday pipeline review (`pipeline-review` SOP) for all seven businesses and end with three priorities, each with an owner and a task."),
    ("compliance-check", "Compliance check", "compliance-legal", "finance-governance", "0 10 * * 1",
     "Monday compliance check (`compliance-calendar` SOP): everything expiring in 90 / 60 / 30 days, renewal tasks for anything inside its lead time, board copied at 30 days."),
    ("b2c-weekly-growth", "B2C weekly growth review", "b2c-growth", "india-b2c", "0 10 * * 2",
     "Tuesday growth report (`b2c-acquisition` SOP): new customers, first-to-second order rate, CAC, 30-day repeat, LTV, and keep / stop decisions per campaign. Include next week's content plan."),
    ("cash-review", "Cash and collections review", "cfo", "finance-governance", "0 11 * * 4",
     "Thursday cash review (`cash-and-margin-review` SOP): opening balance, receipts by age, committed payments, 4-week forecast, weeks of cover, credit-hold proposals."),
    ("weekly-margin-report", "Weekly margin report", "analyst", "finance-governance", "0 15 * * 5",
     "Friday margin report (`cash-and-margin-review` SOP) by product, channel and market. Flag anything losing money and any customer below 5% margin, worst first."),
    ("monthly-business-review-run", "Monthly business review", "ceo", "finance-governance", "0 10 2 * *",
     "Monthly business review (`monthly-business-review` SOP): one row per business with Grow / Fix / Pause, plus product, margin and AI-spend views. The board decides."),
    ("monthly-market-scan", "Monthly market and subsidy scan", "analyst", "setup", "0 11 5 * *",
     "Monthly market scan (`market-scan` SOP) with the subsidy deadlines from the Finance Controller's tracker: three opportunities and three threats, each with an action and owner."),
    ("quarterly-sku-review", "Quarterly product and strategy review", "ceo", "setup", "0 10 7 1,4,7,10 *",
     "Quarterly product and strategy review (`monthly-business-review` and `sku-master-governance` SOPs): kill list, priorities per business, and hires or agent changes to propose to the board."),
]

WEBHOOK_ROUTINES = [
    ("cold-chain-alert", "Cold-chain sensor alert", "ops-quality", "operations-backbone",
     "A temperature logger reported an out-of-range reading. The sensor payload is attached to this task. Follow the `cold-chain-breach` SOP at once: hold the batches, record the event, mark urgent and alert the QC and floor lead."),
]

# ------------------------------------------------------------------ starter tasks
STARTERS = [
    ("resolve-source-gaps", "Resolve the open questions in the source documents", "ceo", "setup", "high",
     """List every open question in `truelay-context` (Mali vs Malé, buffalo and crab sourcing, egg brand names per market, boiled-egg packs, export egg codes, unverified health claims) and any other gap you find. For each, write the decision needed, who decides, and the default if nobody decides in 7 days. Raise one board approval with the list. Update `truelay-context` only after the board answers."""),
    ("build-sku-master", "Build the product list (SKU master)", "analyst", "setup", "high",
     """Build the single product list for all 153 products with the columns in `sku-master-governance`. Start from the files the founder drops under `data/erp/` or on this task. Mark each product active / on request / inactive and each health claim verified / not verified. Flag duplicates and missing costs. Done when every product has one code and a full row, and the founder has approved the list."""),
    ("compliance-register", "Build the licence, certificate and contract register", "compliance-legal", "finance-governance", "high",
     """Build the register from the `compliance-calendar` checklist and the documents on the shared drive: item, authority, site or product, number, issue date, expiry, owner, renewal lead time, file link. Add the contract register (party, type, start, end, key terms, renewal date, file link). Mark anything not confirmed "verify with CA / consultant". Done when the CA and the food-regulatory consultant have reviewed it."""),
    ("founder-dashboard", "Set up the founder dashboard and the 12 numbers", "analyst", "setup", "high",
     """For each of the 12 numbers in `founder-daily-brief`, write down where it comes from today (system or file), who updates it, and how fresh it is. Propose the Looker Studio or Metabase dashboard layout. Done when the Chief of Staff can fill all 12 numbers for three days running with no "missing"."""),
    ("crm-migration", "Load all buyers into the CRM", "b2b-sales", "india-b2b", "medium",
     """Load every B2B and export buyer into the CRM with the columns in the master-list section of the implementation guide: name, segment, market, channel, contacts, GST, rate card, credit limit and terms, usual order days, owner, data consent. Harnika owns export customer data: she approves the import. Never paste contacts into this task. Done when Harnika signs off."""),
    ("cold-chain-loggers", "Connect every cold room and vehicle logger", "ops-quality", "operations-backbone", "medium",
     """List every cold room and vehicle, its logger, how it reports, and its limits. Confirm the 2-hourly sweep can read each one. Work with the setup person to point the logger platform's alert webhook at the "Cold-chain sensor alert" routine. Done when a test alert creates an urgent task within one minute."""),
    ("hire-india-b2b-kam", "Hire the India B2B key account manager", "revenue-lead", "india-b2b", "medium",
     """Draft the job description, the target account list (Hyderabad hotels, hospitals, institutions) and the first-90-day plan for the India B2B key account manager. The founder hires; you prepare. Raise a board approval for the role and salary band."""),
    ("mygate-pilot", "MyGate society pilot with Sandeep", "b2c-growth", "india-b2c", "medium",
     """Plan a 4-week MyGate pilot with Sandeep using the `b2c-acquisition` SOP: target societies and pincodes, offer, budget, expected new customers, CAC limit, dates. Raise a board approval for the budget. Report weekly in the Tuesday growth review."""),
    ("gem-registration", "Prepare GeM seller registration", "compliance-legal", "india-b2g", "medium",
     """List the documents and steps for GeM seller registration for eggs, and check which ones Truelay already has in the register. Prepare the pack for Sri Kumar. A person registers on the portal; you never submit."""),
]

# ------------------------------------------------------------------ write files
if os.path.exists(OUT):
    # Clear the contents but keep the folder, so an open shell or editor in it
    # does not block regeneration on Windows.
    for entry in os.listdir(OUT):
        target = os.path.join(OUT, entry)
        if os.path.isdir(target):
            shutil.rmtree(target)
        else:
            os.remove(target)

dept_rows = [
    (1, "Customer Care & Complaints", "customer-care"), (2, "Business Development & Strategy", "revenue-lead"),
    (3, "Innovation", "analyst"), (4, "Legal", "compliance-legal"), (5, "Creatives & Content", "b2c-growth"),
    (6, "Data Analytics", "analyst"), (7, "Certification", "compliance-legal, export-desk"),
    (8, "Marketing & Sales", "revenue-lead, b2b-sales, b2c-growth"), (9, "Value Added & Byproducts", "supply-planner, ops-quality"),
    (10, "Accounts", "cfo"), (11, "Product List", "analyst"), (12, "AI & Automation", "analyst"),
    (13, "Procurement", "supply-planner"), (14, "Processing", "ops-quality"), (15, "Packaging", "supply-planner, ops-quality"),
    (16, "Finance", "cfo"), (17, "Quality Control", "ops-quality"), (18, "Operations", "ops-quality"),
    (19, "Transportation & Logistics", "ops-quality"), (20, "Market Research", "analyst"),
    (21, "Distribution Channels", "revenue-lead"), (22, "Software", "analyst"), (23, "Growth Hacking", "b2c-growth"),
    (24, "Supply Chain", "supply-planner"), (25, "Human Resources", "compliance-legal (records); humans hire"),
    (26, "Networking", "analyst, revenue-lead"), (27, "Tax", "cfo"), (28, "Collaborations", "analyst, revenue-lead"),
    (29, "Warehouse", "ops-quality"), (30, "Shipping - Export", "export-desk"),
    (31, "New Age & Trend Identification", "analyst"), (32, "Waste, Returns & Expiry", "ops-quality"),
    (33, "Subsidies & Schemes", "cfo"), (34, "Compliance & Risk Management", "compliance-legal"),
]

company_body = """# Truelay

**Mission:** safe protein at the best landed cost, growing every month.

Truelay sells fresh and frozen chicken, mutton, seafood and eggs across seven businesses: India B2B, India B2C, India B2G, Dubai B2B, Dubai B2C, Oman B2B and Maldives B2B.

## How this company runs

- **Agents do the work, humans make the decisions.** Agents prepare plans, drafts, documents, reminders and reports. A human approves anything that moves money, changes a price, releases food or a shipment, signs a contract or files with a government (skill `approval-gates`).
- **Few agents, many skills.** 11 agents cover 34 departments. Each department is an SOP skill.
- **Routines, not always-on.** Agents wake on a schedule or when a task is assigned. Timer heartbeats are off.
- **One home for each kind of data.** ERP for orders, stock and batches; CRM for customers; accounting for money; the register for licences. Paperclip holds the work and the decisions.

## Goals

1. Founder brief by 08:30 every day with all 12 numbers.
2. Buy plan by 04:00 every day; landed cost within 3% of plan.
3. Zero cold-chain breaches reaching a customer; OTIF above 95%.
4. Zero export document errors.
5. Zero complaints open over 24 hours.
6. Zero actions taken without a required approval.
7. AI spend within $250 a month.

## Org chart

```
Board (Founder + Deputy)
└── ceo · Chief of Staff
    ├── cfo · Finance Controller
    ├── supply-planner · Supply Planner
    ├── ops-quality · Ops and Quality
    │   └── customer-care · Customer Care
    ├── export-desk · Export Desk
    ├── revenue-lead · Revenue Lead (CMO)
    │   ├── b2b-sales · B2B Sales Desk
    │   └── b2c-growth · B2C Growth
    ├── compliance-legal · Compliance and Legal
    └── analyst · Analyst
```

## Department map

| # | Department | Agent |
|---|---|---|
""" + "\n".join(f"| {n} | {d} | {a} |" for n, d, a in dept_rows) + "\n"

write("COMPANY.md", fm([
    ("schema", "agentcompanies/v1"),
    ("slug", "truelay"),
    ("name", "Truelay"),
    ("description", "Fresh and frozen protein (chicken, mutton, seafood, eggs) for India B2B, B2C and B2G and for Dubai, Oman and Maldives. 11 AI agents run the paperwork for 34 departments; about 9 people decide."),
    ("version", "1.0.0"),
    ("goals", ["Founder brief by 08:30 daily with all 12 numbers",
               "Buy plan by 04:00 daily with landed cost within 3% of plan",
               "Zero cold-chain breaches reaching a customer and OTIF above 95%",
               "Zero export document errors",
               "Zero complaints open over 24 hours",
               "Zero actions taken without a required approval",
               "AI spend within 250 USD a month"]),
]) + company_body)

for a in AGENTS:
    write(f"agents/{a['slug']}/AGENTS.md", agent_md(a))

write("teams/revenue/TEAM.md", fm([
    ("name", "Revenue"), ("slug", "revenue"),
    ("description", "Revenue Lead with the B2B Sales Desk and B2C Growth."),
    ("manager", "../../agents/revenue-lead/AGENTS.md"),
    ("includes", ["../../agents/b2b-sales/AGENTS.md", "../../agents/b2c-growth/AGENTS.md"]),
]) + "# Revenue team\n\nGrows revenue across the seven businesses. Priorities: existing export buyers, India B2B key accounts, B2G egg tenders, B2C through partners.\n")
write("teams/operations/TEAM.md", fm([
    ("name", "Operations"), ("slug", "operations"),
    ("description", "Ops and Quality with Customer Care."),
    ("manager", "../../agents/ops-quality/AGENTS.md"),
    ("includes", ["../../agents/customer-care/AGENTS.md"]),
]) + "# Operations team\n\nEvery order leaves on time, in temperature and in spec; complaints are solved fast and their causes fixed.\n")

for slug, name, desc, owner in PROJECTS:
    write(f"projects/{slug}/PROJECT.md", fm([
        ("name", name), ("slug", slug), ("description", desc), ("owner", owner),
    ]) + f"# {name}\n\n{desc}\n")

for slug, name, assignee, project, cron, body in ROUTINES:
    write(f"projects/{project}/tasks/{slug}/TASK.md", fm([
        ("name", name), ("slug", slug), ("assignee", assignee), ("project", project), ("recurring", True),
    ]) + body + f"\n\nSchedule: `{cron}` ({TZ}).\n")

for slug, name, assignee, project, body in WEBHOOK_ROUTINES:
    write(f"projects/{project}/tasks/{slug}/TASK.md", fm([
        ("name", name), ("slug", slug), ("assignee", assignee), ("project", project), ("recurring", True),
    ]) + body + "\n\nTrigger: webhook from the cold-chain logger platform (see INTEGRATION-GUIDE.md).\n")

for slug, name, assignee, project, priority, body in STARTERS:
    write(f"projects/{project}/tasks/{slug}/TASK.md", fm([
        ("name", name), ("slug", slug), ("assignee", assignee), ("project", project),
    ]) + body + "\n")

for slug, (desc, body) in SKILLS.items():
    write(f"skills/{slug}/SKILL.md", fm([("name", slug), ("description", desc)]) + body)

# ------------------------------------------------------------------ .paperclip.yaml
y = ["schema: paperclip/v1", "schemaVersion: 7", "company:", "  requireBoardApprovalForNewAgents: true", "  logoPath: images/company-logo.png", "agents:"]
for a in AGENTS:
    y += [f"  {a['slug']}:", f"    role: {a['role']}", f"    budgetMonthlyCents: {a['budget']}"]
    y += ["    adapter:", "      type: claude_local", "      config:", f"        model: {a['model']}"]
    if a["effort"]:
        y.append(f"        effort: {a['effort']}")
    y += ["        maxTurnsPerRun: 60", "        timeoutSec: 1800", "        graceSec: 15"]
    y += ["    runtime:", "      heartbeat:", "        enabled: false", "        intervalSec: 0",
          "        wakeOnDemand: true", "        wakeOnAssignment: true", "        wakeOnAutomation: true",
          "        maxConcurrentRuns: 1"]
    y += ["    permissions:", "      canCreateAgents: false"]
    y += ["    inputs:", "      env:", "        ANTHROPIC_API_KEY:", "          kind: secret", "          requirement: optional",
          "          description: Anthropic API key. Leave empty to use the key or Claude login on the Paperclip host."]
    seen = set()
    for group in a["env"]:
        for key, kind, desc in ENV_GROUPS[group]:
            if key in seen:
                continue
            seen.add(key)
            y += [f"        {key}:", f"          kind: {kind}", "          requirement: optional", f"          description: {desc}"]
y.append("projects:")
colors = {"india-b2b": "#2563eb", "india-b2c": "#db2777", "india-b2g": "#16a34a", "dubai": "#d97706",
          "oman": "#0891b2", "maldives": "#7c3aed", "operations-backbone": "#dc2626",
          "finance-governance": "#475569", "setup": "#65a30d"}
for slug, name, desc, owner in PROJECTS:
    y += [f"  {slug}:", f"    leadAgentSlug: {owner}", f"    color: \"{colors[slug]}\""]
y.append("tasks:")
for slug, name, assignee, project, priority, body in STARTERS:
    y += [f"  {slug}:", f"    priority: {priority}"]
y.append("routines:")
for slug, name, assignee, project, cron, body in ROUTINES:
    y += [f"  {slug}:", "    concurrencyPolicy: coalesce_if_active", "    catchUpPolicy: skip_missed", "    triggers:",
          "      - kind: schedule", f"        label: {name}", f"        cronExpression: \"{cron}\"", f"        timezone: {TZ}"]
for slug, name, assignee, project, body in WEBHOOK_ROUTINES:
    y += [f"  {slug}:", "    concurrencyPolicy: always_enqueue", "    catchUpPolicy: skip_missed", "    triggers:",
          "      - kind: webhook", "        label: Cold-chain logger alert", "        signingMode: bearer", "        replayWindowSec: 300"]
write(".paperclip.yaml", "\n".join(y) + "\n")

# Company logo: the square "T" icon cut from the Truelay wordmark.
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "brand", "company-logo.png")
os.makedirs(os.path.join(OUT, "images"), exist_ok=True)
shutil.copyfile(LOGO, os.path.join(OUT, "images", "company-logo.png"))

print(f"agents={len(AGENTS)} skills={len(SKILLS)} projects={len(PROJECTS)} "
      f"routines={len(ROUTINES) + len(WEBHOOK_ROUTINES)} starter_tasks={len(STARTERS)}")
