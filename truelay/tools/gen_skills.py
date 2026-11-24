# Skill (SOP) content for the Truelay company package.
# Each entry: slug -> (description, body markdown)

SKILLS = {}

def skill(slug, description, body):
    SKILLS[slug] = (description, body.strip() + "\n")

# ---------------------------------------------------------------- A. company-wide

skill("truelay-context", "Company facts every Truelay agent must know before doing anything: businesses, customers, products, sourcing, brands, time and money conventions.", r"""
# A1. Truelay company context

Read this before every run. If a fact you need is missing here, say so on the task and label your output "unverified". Do not invent facts.

## Mission

Safe protein at the best landed cost, growing every month.

## The seven businesses

| Business | Customers | Products | Human owner | Customer data |
|---|---|---|---|---|
| India B2B | HoReCa, institutions, hospitals, supermarkets, quick commerce | Fresh chicken, mutton, seafood, eggs; liquid egg 1/5/10 kg | India B2B key account manager | CRM (to build) |
| India B2C | Households via app, quick commerce, MyGate, milk vendors, Sangam Daily | Full range: 153 products (20 egg, 26 chicken, 27 mutton, 66 fish, 9 prawn, 5 crab) | Sandeep (MyGate) | CRM (to build) |
| India B2G | Defence, Anganwadis, government hostels and schools | Fresh eggs | Sri Kumar | Tenders |
| Dubai B2B | HoReCa, quick commerce, supermarkets | Mutton fresh + frozen, eggs fresh, shrimp fresh + frozen | Rajesh | Harnika |
| Dubai B2C | Households | Mutton, eggs, shrimp (fresh) | Rajesh | To build |
| Oman B2B | HoReCa, supermarkets | Frozen chicken, mutton, eggs, shrimp | Rajesh | Harnika |
| Maldives B2B | HoReCa, supermarkets | Frozen chicken, mutton, eggs, shrimp, buffalo | Rajesh, Sai | Harnika |

## Sourcing

- Mutton: Hyderabad, Bangalore
- Chicken: Hyderabad (frozen also Coimbatore)
- Shrimp: Bhimavaram
- Fish: Hyderabad fresh, Bhimavaram frozen
- Eggs: Hyderabad

## Egg brands

Nest Select, Super Eggs (Omega + Selenium, Vitamin Plus), Origin, Seven Wonders, Yolkies, Flow (liquid), Protein Pods (boiled).

## Launch range

Each market sells its top 25-40 products. Every other product is "on request": kept in the product list, made only when ordered.

## Time and money

- All times are IST (Asia/Kolkata).
- Money is INR unless an export document says AED, OMR, USD or MVR. Always write the currency.
- Write Indian amounts as Rs 2,00,000 or Rs 2 lakh.

## The people

| Person | Role | Decides |
|---|---|---|
| Founder | Board | Money, prices, credit, shipments, hires, strategy |
| Deputy | Board (backup approver) | Same as founder when founder is away |
| Rajesh | Export buyer relationships (Dubai, Oman, Maldives) | Export prices with buyers, co-approves shipment release |
| Sai | Maldives relationships | Maldives buyer conversations |
| Harnika | Export customer data owner | Who can see or export customer data |
| Sri Kumar | India B2G tenders and government relationships | Tender go / no-go with the board |
| Sandeep | MyGate partnership | B2C partner campaigns |
| Procurement Executive | Places POs, supplier calls, market visits | What is actually bought |
| QC and floor lead | Physical QC, batch hold and release | Releasing any held batch |
| India B2B key account manager | Face-to-face B2B selling | Promises to new B2B customers |

## Open questions (do not assume an answer)

These are not decided yet. If your work depends on one, flag it on the task and tag the Chief of Staff:

- "Mali" in the source documents probably means Malé, Maldives. Confirm before using it in any document.
- Buffalo and crab sourcing locations.
- Final egg brand names per market and boiled-egg pack sizes.
- Export egg codes.
- Whether nutrition and health claims (25 g protein, Omega, Vitamin Plus) are lab-verified. Until a lab report is attached in the product list, treat every claim as NOT verified.
""")

skill("approval-gates", "The Truelay approval matrix and the exact steps an agent follows when an action needs a human decision. Read before any action that moves money, changes a price, releases goods or sends anything outside the company.", r"""
# A2. Approval gates

Agents prepare. People decide. Before any action, check the matrix below.

## Approval matrix

The limits are starting values. The board edits them in this file. When this file changes, the new limits apply from the next run.

| Action | Limit that needs approval | Approver |
|---|---|---|
| Purchase order | Above Rs 2,00,000, or any new supplier | Board |
| Price or rate-card change | More than 5% on any product, or any new rate card | Board |
| Discount or promotion | Outside the approved monthly promo budget | Board |
| Credit limit, credit term, credit hold or release | Any | Board |
| Refund, credit note or coupon | Above Rs 2,000 per case, or above Rs 25,000 per day in total | Board |
| Any payment | Any. Agents never pay. | Board |
| Release of a held batch | Any | QC and floor lead |
| Export shipment release | Every shipment | Board + Rajesh |
| Submission to customs, certifier, government portal or tender | Every submission | Board |
| New or changed contract | Any | Board + lawyer |
| Price, credit or delivery promise to a new customer | Any | Human account owner |
| Bulk customer message or campaign | Above 500 recipients | Board |
| Export or sharing of customer data | Any | Harnika |
| New agent, budget change, new tool or connection | Any | Board |

## First-week safety setting

For the first 7 days after go-live, every outgoing customer message and every purchase order needs approval, whatever its size. The board removes this paragraph on day 8.

## How to ask

1. Prepare everything first: the draft, the numbers, the document, the evidence.
2. Raise a `request_board_approval` approval linked to the task (see the Paperclip skill, "Requesting Board Approval"). The approval body must contain:
   - **Title**: verb + object + number, for example "Approve release of shipment DXB-0142".
   - **What**: one line with the quantity and value, with currency.
   - **Recommended action**.
   - **Checks complete**: the evidence, with links.
   - **Risks**, including what happens if the decision is late.
   - **Deadline**.
   - **Approver(s)** from the matrix. If the approver is a person, not the board, name them and @-mention them on the task.
3. Move the task to `in_review` and stop. Do not do anything else on that action.
4. When approved, do exactly what was approved, nothing more. Record the result on the task.
5. When rejected, record the reason. Never retry the same action unchanged. Propose an alternative only if the rejection asks for one.

## Things an agent never does, with or without approval

- Pay anyone, or enter bank, card or payment details.
- Sign anything.
- Submit to a government, customs, certifier or tender portal. A person submits.
- Release a held batch. Only the QC and floor lead does that.
- Create or hire agents, or change budgets.

## Tools set to "ask first"

Some connected tools (payments, bulk sends, portal submissions, stock adjustments, batch release) are set to "ask first" in Paperclip. When you call one, Paperclip posts an approval card and runs the call only after a human approves. That is expected. Do not try another tool to get around it.

## Approval waiting too long

If an approval has waited more than 4 hours, the Chief of Staff reminds the deputy board member.
""")

skill("data-handling", "Truelay rules for data: one home per kind of data, customer-data privacy, opt-in messaging, source-and-time on every number, never delete. Also how to work from CSV files before systems are connected.", r"""
# A3. Data handling

## One home for each kind of data

| Data | Home |
|---|---|
| Orders, stock, batches, expiry, purchase orders | ERP |
| Customers, contacts, deals, history | CRM |
| Money: invoices, receipts, payables, ledgers | Accounting system (Tally Prime or Zoho Books) |
| Licences, certificates, contracts | Compliance register on the shared drive |
| Work, decisions, approvals | Paperclip tasks |

Tasks link to records. They do not copy them. Write "ERP order SO-1234", not the whole order.

## Customer data

1. Customer data is kept apart from business management.
2. Export customer data belongs to Harnika's role. Never paste phone numbers, emails or customer lists into tasks, comments or documents.
3. Refer to a customer by account name or CRM ID only.
4. Message B2C customers only if they opted in. Honour an opt-out within one day.
5. Any export or sharing of customer data needs Harnika's approval (see approval-gates).

## Numbers

1. Every number you report carries its source and time, for example "Receivables over 30 days: 14% (Tally, 07:55 today)".
2. If you cannot check a number, label it "unverified". Never fill a gap with a guess.
3. If a number the brief needs is missing, say "missing" and name the system. Do not drop it silently.

## Records

Never delete a record. Mark it inactive with the reason and date.

## Before systems are connected: working from files

Until a system is connected, people drop exports into Paperclip:

- Attached to the task (CSV or XLSX), or
- In the project workspace under `data/<system>/`, for example `data/erp/stock-2026-11-24.csv`, `data/crm/customers.csv`, `data/accounting/receivables.csv`, `data/coldchain/loggers.csv`.

Rules for files:

1. Always use the newest file and state its date. If the newest file is more than 24 hours old for a daily routine, flag it as stale.
2. Do not edit the source file. Write results to a new file or to the task.
3. When the system is connected, use the system and ignore old files.

## Secrets

Never write an API key, token or password into a task, comment, document or file.
""")

# ---------------------------------------------------------------- B. supply and operations

skill("daily-buy-plan", "SOP for the Supply Planner's daily 03:30 buy plan: confirmed orders plus expected demand, minus usable stock, converted to raw kg, split across suppliers, with landed cost and flags. Delivered by 04:00.", r"""
# B1. Daily buy plan (Supply Planner, 03:30)

**Output by 04:00** to the Procurement Executive, posted on the routine's task.

## Steps

1. Take confirmed orders for today (order cut-off 22:00 the night before) by product and location.
2. Add expected top-up demand: the average of the last 4 same weekdays, adjusted for festivals.
3. Subtract usable stock. First expiry, first out. Skip held batches and anything expiring before delivery.
4. Convert finished kg to raw kg using the yield standard for each cut.
5. Split across suppliers by price, quality score and the two-supplier rule (no supplier above 50% of a species' monthly volume; at least two approved suppliers per species).
6. Work out landed cost per kg = price + transport + processing + expected wastage. Compare with plan.
7. Flag:
   - every line more than 3% above plan;
   - every order above the PO approval limit (raise an approval, see approval-gates);
   - any supplier price up more than 10% in a week (board note with alternatives, see below);
   - any product not on the product list (do not buy it).

## Output format

One table, one line per raw product:

| Product (raw) | Need (kg) | Supplier | Price (Rs/kg) | Landed cost (Rs/kg) | vs plan | Flag |
|---|---|---|---|---|---|---|

Then **Notes**: one line per unusual choice with its reason (for example "Supplier B used because A is capped at 50%"), and stock expiring tomorrow with a proposed use.

## Price spike rule

If a supplier price is up more than 10% in a week, open a task for the board, linked to the buy plan, with options: second supplier, frozen from another region for some lines, forward contract. Ask the Analyst to show which customers and products lose margin.

## Never

Place a purchase order (the Procurement Executive does), add a supplier, or buy a product that is not on the product list.
""")

skill("supplier-management", "SOP for approving suppliers, the two-supplier rule and the monthly supplier scorecard.", r"""
# B2. Supplier management (Supply Planner)

1. Each species has at least two approved suppliers. No supplier above 50% of a species' monthly volume.
2. Supplier approval file: licences (FSSAI; APEDA, MPEDA or EIC for export lines), contract, price basis (market / farm-gate / trader / negotiated), sample QC result, payment terms. A new supplier needs board approval.
3. Monthly scorecard per supplier: price vs market, QC reject %, on-time %, paperwork complete. Score out of 100.
4. A score below 80 for two months running = open a review task for the board with the evidence and a proposed second source.
5. Three or more freshness complaints on the same supplier in a week (from Customer Care's trend) = open a supplier review and propose moving volume.

Output: monthly scorecard table on a task in the Operations Backbone project, first working day of the month.
""")

skill("sku-master-governance", "Product list (SKU master) rules: one code and a full row per product, new-product approval, quarterly move to 'on request', and health-claim verification.", r"""
# B3. Product list rules (Analyst, Supply Planner, Chief of Staff)

## The product list row

Every product has one code and a full row:

Code, name, species, cut, form (fresh / frozen / liquid / boiled), pack size, channels, markets, brand family, cost (procurement, processing, packaging, channel), selling price per channel, shelf life, label claims, claim lab-verified (yes / no), status (active / on request / inactive).

## Rules

1. One product, one code. No duplicates. Mark old codes inactive with the reason; never delete.
2. A new product needs a cost sheet, QC spec and expected monthly volume, and board approval.
3. Every quarter, products under 5 orders a month move to "on request". The Chief of Staff presents the kill list in the quarterly review.
4. Health claims (25 g protein, Omega + Selenium, Vitamin Plus) stay "not verified" until a lab report is attached. Nobody may use an unverified claim in content or labels.
5. Asset files (photos, labels) carry the product code in the file name.

## Owner

The Analyst keeps the list. The Supply Planner keeps the cost columns current. The Chief of Staff owns the quarterly review.
""")

skill("qc-acceptance", "SOP for receiving QC, temperature limits, accept/deduct/reject decisions, pre-dispatch checks and export pre-shipment inspection.", r"""
# B4. QC acceptance (Ops and Quality, Export Desk)

1. At receipt, record per lot: supplier, species, weight vs order, grade, core temperature, look and smell, packaging, papers.
2. Starting limits (the QC lead can tighten them):
   - Fresh meat, poultry and fish: 0 to 4 °C
   - Frozen: -18 °C or colder
   - Eggs: clean and uncracked
3. Decision: accept, accept with deduction, or reject. Rejects are debited to the supplier the same day, with photos.
4. Before dispatch, sample-check label, batch code, best-before and weight.
5. Export: attach the pre-shipment inspection record to the shipment task.
6. A failed QC puts the lot on hold at once (status in ERP).
7. Only the human QC and floor lead releases a held lot. The agent never does.

Yield: record yield per batch (usable kg out / raw kg in) against the standard for that cut. Any batch below standard goes on the 08:45 huddle list.
""")

skill("cold-chain-breach", "SOP for a cold room or vehicle temperature breach: hold batches at once, record the event, alert the QC lead, record the root cause.", r"""
# B5. Cold-chain breach (Ops and Quality)

A breach is any reading outside the QC limits (fresh above 4 °C, frozen warmer than -18 °C) for more than 15 minutes, or a logger that stopped reporting.

1. Hold every affected batch at once in the ERP. Holding is automatic and needs no approval.
2. Record: place or vehicle, start time, end time, highest temperature, batches and kg affected.
3. Mark the task **urgent** and @-mention the QC and floor lead.
4. The QC lead decides per batch: release, downgrade (for example to processing) or destroy. Record the decision on the task.
5. Tell the Supply Planner which stock is held so the buy plan still covers morning orders.
6. Record the cause: equipment, power, door discipline, loading or route. Propose one corrective action with an owner.
7. The breach is counted in the founder brief (number 6) until closed.

## Sweep (every 2 hours)

Read every cold room and vehicle logger since the last sweep. If nothing is out of range, post one line: "Sweep HH:MM: all N loggers in range." If a logger is missing data, treat it as a breach for that unit.

## Instant alert

When the cold-chain webhook fires, the payload names the sensor and reading. Follow steps 1-7 at once.
""")

skill("dispatch-planning", "SOP for routes, temperature loggers, delivery paperwork, credit-hold checks and on-time-in-full recording.", r"""
# B6. Dispatch planning (Ops and Quality)

1. After order cut-off (22:00), build routes by slot and area. Keep chilled and frozen loads apart.
2. Every vehicle carries a temperature logger. No logger, no dispatch.
3. Each drop carries invoice, delivery challan and temperature slip.
4. Do not load for an account on credit hold without approval (check with the Finance Controller's list).
5. Record on-time-in-full (OTIF) for each drop and the reason for any miss, the same day.

## 08:45 huddle prep

Post a list for the 09:15 huddle. Each line ends in a decision or an action:

- **Yesterday's misses**: late drops, short deliveries, rejects, with reason.
- **Today's risks**: supply short, equipment due, stock expiring, held batches.
- **Held batches**: count and where, awaiting whom.
""")

skill("waste-and-expiry", "SOP for daily expiry list, write-off log, weekly loss report and byproduct sales.", r"""
# B7. Waste and expiry (Ops and Quality)

1. Daily: list stock expiring within 48 hours (fresh) or 30 days (frozen). Propose markdown, bulk B2B sale or processing for each line.
2. Record every write-off with its reason: processing, packaging, handling, spoilage, expiry, return.
3. Weekly: loss cost by reason and product, the top three causes and a fix for each with an owner.
4. Byproducts (bones, skin, fat, fish heads, shells) are sold and logged as revenue, not waste. Keep the byproduct buyer list and volumes current with the Supply Planner.

Target: wastage + expiry + returns under 2% of sales (founder brief number 5).
""")

# ---------------------------------------------------------------- C. export

skill("export-doc-pack", "Export document pack for every shipment and the checks before asking for shipment release. Zero document errors.", r"""
# C1. Export document pack (Export Desk)

## Pack for every shipment

- Proforma invoice, commercial invoice, packing list
- Certificate of origin
- Health / veterinary certificate (EIC or the competent authority)
- Halal certificate from a body the destination accepts (Gulf meat and poultry)
- Destination product registration proof (UAE, Oman, Maldives as needed)
- Pre-shipment QC record and temperature record
- Shipping bill, bill of lading or air waybill, insurance

## Checks before asking for release

1. Names, weights, counts and HS codes match across every document.
2. Labels in the required language (Arabic for the Gulf) and shelf life meet the buyer's spec.
3. Every certificate is valid on the shipment date (check with Compliance and Legal's register).
4. Advance received or LC confirmed (check with the Finance Controller).
5. Any rule you are unsure of is marked "verify with customs broker". Never guess a customs rule.

## Release request

Raise one approval for the Board + Rajesh with the release checklist:

| Check | Status | Evidence |
|---|---|---|
| QC pre-shipment inspection passed | | Inspection record |
| Temperature at -18 °C or below throughout | | Logger file |
| Invoice, packing list, certificate of origin match (names, weights, counts, HS codes) | | Document pack |
| Health certificate valid | | Certificate |
| Halal certificate valid and accepted at destination | | Certificate |
| Destination product registration in place | | Registration proof |
| Labels in required language and shelf life per buyer spec | | Label photo |
| Advance received or LC confirmed | | Bank credit |

The approver must be able to decide from the card alone.

## Never

Submit to customs, certifiers or buyers, or release a shipment. People do that after approval.
""")

skill("export-order-flow", "The end-to-end export order flow from buyer PO to payment, with Rajesh and Sai, and the daily 12:00 shipment watch.", r"""
# C2. Export order flow (Export Desk with Rajesh / Sai)

One Paperclip task per shipment, named with the shipment code, for example "DXB-0142: 1 x 20 ft frozen mutton to Dubai". Put it in the destination's project (Dubai, Oman or Maldives).

1. Buyer PO or enquiry logged in the CRM (Harnika's data).
2. Spec agreed: cut, weight band, glaze, pack, label language, shelf life. Check it against the buyer's last order.
3. Proforma and payment term sent only after approval (price confirmed by Rajesh; board for new terms).
4. Production slot booked with Ops and Quality; freezing to -18 °C or below; pre-shipment inspection.
5. Document pack built and checked (export-doc-pack).
6. Shipment release approved by the Board + Rajesh. Then reefer or air freight booked.
7. Shipment tracked to arrival; destination clearance supported.
8. Balance collected (Finance Controller); file closed; buyer feedback recorded.

## Daily shipment watch (12:00, Mon-Sat)

For every open shipment task, one line: shipment code, stage (1-8), next step and date, and any risk:

- a document missing or a certificate expiring before the ship date (stop the release request, tell Rajesh and the board the same day);
- payment not received when due;
- vessel or flight cut-off within 72 hours without approval.

If nothing is at risk, say so in one line.
""")

# ---------------------------------------------------------------- D. sales, growth, customers

skill("pipeline-review", "Monday 09:30 pipeline review across the seven businesses, ending with three priorities for the week.", r"""
# D1. Pipeline review (Revenue Lead, Monday 09:30)

For each of the seven businesses:

- Revenue last week vs target
- New accounts
- Lost or quiet accounts
- Top 10 open deals with next step and date
- Quotes waiting for approval
- Payment risks from the Finance Controller

End with **three priorities for the week**, each with an owner (agent or person) and a date. Create or update a task for each priority.

Standing priorities until the board changes them:

1. Sell more to existing export buyers.
2. India B2B key accounts in Hyderabad.
3. B2G egg tenders.
4. B2C through partners before our own app.
""")

skill("b2b-onboarding", "Steps to turn a qualified B2B lead into a live account in CRM and ERP.", r"""
# D2. B2B onboarding (B2B Sales Desk, Revenue Lead)

1. Qualify: segment, location, weekly volume, products, ability to pay.
2. Sample and spec sheet; record chef or buyer feedback.
3. Quote from the approved rate card. Any change needs approval (pricing-and-quotes).
4. Collect GST, address, contacts and licences. Store them in the CRM, not in the task.
5. Agreement with service levels and credit terms. Advance payment by default. The agreement needs approval.
6. Create the account in CRM and ERP; set the standing order and order cut-off.
7. Check in within 24 hours of the first delivery; review after 2 weeks.

Any price, credit or delivery promise to a new customer needs the human account owner's approval first.
""")

skill("pricing-and-quotes", "Pricing formula, starting target margins, quote validity and when a price or quote needs approval.", r"""
# D3. Pricing and quotes (Revenue Lead, B2B Sales Desk)

1. Price = landed cost + processing + packaging + logistics + channel cost + target margin.
2. Starting target gross margins (the board sets the final numbers): B2B 15-20%, B2C 30-35%, export per buyer contract.
3. Quotes are valid 7 days for fresh, 30 days for frozen, with a price-review clause tied to market price.
4. Any quote below target margin, or any change over 5%, needs approval.
5. Every quote shows the cost build-up in an internal note on the task so the approver can check it.
6. Never send a price, discount or credit term to a customer before approval.
""")

skill("b2c-acquisition", "B2C channel order, campaign plan fields, weekly growth metrics and the stop rule.", r"""
# D4. B2C acquisition (B2C Growth)

1. Channel order: MyGate society campaigns (with Sandeep), milk-vendor bundles, Sangam Daily, quick-commerce listings, referrals, then paid ads.
2. Each campaign is a task with: target pincodes, offer, budget, expected new customers, cost-per-customer limit, dates. Spend needs to be within the approved monthly budget.
3. Weekly (Tuesday 10:00): new customers, first-to-second order rate, cost per customer (CAC), 30-day repeat, lifetime value.
4. Stop any campaign above its cost limit after two weeks.
5. Launch only the top 25-40 products.
6. Egg subscriptions; win-back message after 14 days inactive, to opted-in customers only.
7. Never send to more than 500 people without board approval. Message only customers who opted in.
""")

skill("content-calendar", "Weekly content plan: 3 posts, 2 reels, 1 offer, tied to festivals; claim checks against the product list.", r"""
# D5. Content calendar (B2C Growth)

Each week: 3 posts, 2 reels, 1 offer, tied to festivals and seasons (for example mutton around Eid and Sankranti, eggs in winter).

1. Check every claim against the product list. If a claim is "not verified", do not use it.
2. Write a brief for the photographer or designer for each asset.
3. Save assets with the product code in the file name.
4. Post the plan by Monday on the B2C growth task; the founder or Sandeep approves before anything is published.
""")

skill("complaint-handling", "Customer complaint SOP: log, reply in 2 hours, solve in 24, refund limits, food-safety escalation, cause tagging.", r"""
# D6. Complaint handling (Customer Care)

In scope: phone, chat, email, social; order status, cancellations, delays; product, quality, freshness, packaging, pricing, delivery and staff complaints; refunds and coupon credit; feedback.

Not in scope now: WhatsApp support, in-app support, missing or wrong item tickets, weight complaints, returns and replacements. Route those to the founder with a one-line note.

## Steps

1. Log: customer (CRM ID only), order, product, batch code, category, photos.
2. Reply within 2 hours; solve within 24 hours.
3. Check the batch: delivery date, shelf life, route temperature log.
4. Refund or coupon up to Rs 2,000 per case if the evidence is clear. Above that, or above Rs 25,000 for the day in total, ask for approval.
5. **Illness, foreign matter or contamination**: do not send an automatic reply or refund. Ask Ops and Quality to hold the batch, alert the board at once (urgent task, @-mention the founder and the QC lead). A person calls the customer.
6. Close with the cause and tag it for the weekly trend report.
7. Two more complaints on the same batch = ask Ops and Quality to hold it.

## Hourly sweep (08:00-22:00)

Pick up new complaints, reply to any waiting more than 1 hour, list any open more than 24 hours (founder brief number 11 must be zero).

## Weekly

Trend report: complaints by category, product, supplier and batch; repeat-complaint customers (by CRM ID); top 3 causes, each sent to Ops and Quality as a task.
""")

# ---------------------------------------------------------------- E. finance, compliance, leadership

skill("credit-and-collections", "Credit terms for new B2B accounts, reminder ladder, credit-hold recommendation, B2G payment planning and invoice discounting.", r"""
# E1. Credit and collections (Finance Controller, B2B Sales Desk)

1. New B2B accounts pay in advance or on delivery until three on-time payments. Then the board may approve a credit limit.
2. Reminder ladder, drafted daily (Mon-Sat 10:00) for the account owner to send:
   - Day 1 after due: polite
   - Day 7: firm, copy the account owner
   - Day 15: a person calls
   - Day 30: recommend credit hold
3. Over 30 days overdue: recommend stopping the next dispatch. The board approves the hold. Tell Ops and Quality and B2B Sales once approved.
4. Government (B2G): plan for 60-90 day payment; track bill submission and follow-ups.
5. Large B2B or B2G invoices: suggest invoice discounting (TReDS) to the board.

## Daily collections run output

- Receivables over 30 days as % of book (founder brief number 2).
- Reminders drafted, grouped by account owner.
- Credit-hold proposals, each as a board approval with the ledger evidence.
""")

skill("cash-and-margin-review", "Thursday cash review (weeks of cover) and Friday margin report by product, channel and market.", r"""
# E2. Cash and margin review (Finance Controller, Analyst)

## Cash (Thursday 11:00, Finance Controller)

Opening balance, expected receipts by age, committed payments, 4-week forecast, **weeks of cover** (target: never below 4). Credit-hold proposals for the week.

## Margin (Friday 15:00, Analyst)

Per product and per channel: selling price minus landed cost, processing, packaging, channel cost and logistics. Include quick-commerce commission and rack cost, supermarket commission or rent, distributor margin.

Flag:

- any product or channel losing money;
- any customer below 5% margin.

Output: one table sorted worst first, then three recommendations with owners.
""")

skill("compliance-calendar", "Licence, certificate, tax and statutory register with 90/60/30-day alerts, and the starting checklist to confirm with a CA and food-regulatory consultant.", r"""
# E3. Compliance calendar (Compliance and Legal, Finance Controller, Export Desk)

Keep every item in the register (item, authority, site or product, number, issue date, expiry, owner, renewal lead time, file link). Alerts at 90, 60 and 30 days; copy the board at 30.

## Monday 10:00 check

1. List everything expiring in the next 90 days, grouped 30 / 60 / 90.
2. For each item inside its renewal lead time, open a renewal task with the owner and the documents needed.
3. Founder brief number 12: licences expiring within 60 days, with whether a renewal is planned.

## Starting checklist

Confirm this list with your CA and a food-regulatory consultant. It is a starting list, not legal advice. Mark anything unconfirmed "verify with CA / consultant".

- GST and monthly returns; TDS; advance tax; IEC; Udyam (MSME); shop and establishment or trade licence
- FSSAI central and site licences
- APEDA (meat, poultry, eggs export), MPEDA (seafood), RCMC; EIC approval where needed
- Halal certification accepted in UAE and Oman; UAE, Oman and Maldives import approvals
- Pollution board consents, factory licence, fire NOC
- HACCP plan; ISO 22000 / FSSC 22000 when planned
- Food-handler medical fitness; PF and ESI registers
- Insurance: product liability, goods in transit, stock

## Tax dates (Finance Controller)

Keep GST, TDS and advance-tax dates in the same register with working papers prepared 5 working days before each due date. The CA files.
""")

skill("subsidy-tracker", "Monthly tracker of subsidies and schemes: eligibility, benefit, documents, deadline, status.", r"""
# E4. Subsidy tracker (Finance Controller, monthly)

Track PMFME, PM Kisan SAMPADA, state food-processing and MSME incentives, poultry and fisheries schemes, and export incentives such as RoDTEP.

For each scheme: eligibility, benefit, documents, deadline, status.

1. The CA confirms eligibility. Mark anything unconfirmed "verify with CA".
2. Applications need board approval. A person submits.
3. Report deadlines in the next 60 days in the monthly market and subsidy scan.
""")

skill("contract-review", "Contract checklist, drafting from templates, lawyer review, board signature, filing and renewal dates.", r"""
# E5. Contract review (Compliance and Legal)

Every agreement covers: parties, products and specs, price basis and review clause, quality and rejection, temperature and delivery standards, payment and credit, liability and recall, confidentiality and data, termination, disputes.

1. Draft from the templates on the shared drive. Highlight every change from the template.
2. List missing clauses from the checklist above.
3. A lawyer reviews. The board signs. Raise an approval for Board + lawyer.
4. File the signed copy on the shared drive and add the renewal date to the compliance register.
5. Never sign, and never state that something is legally required unless the lawyer confirmed it.
""")

skill("tender-scan", "Weekday 11:00 scan of GeM and state portals for egg, poultry, meat and fish supply tenders.", r"""
# E6. Tender scan (Analyst, weekdays 11:00)

Search GeM and state portals (start with Telangana, Andhra Pradesh, Karnataka) for egg, poultry, meat and fish supply tenders.

1. Post new matches only (check earlier scan tasks): title, buyer, quantity, value, deadline, link.
2. For each promising one, open a task in the India B2G project assigned to Compliance and Legal, and @-mention Sri Kumar.
3. If nothing new, post one line: "No new matching tenders."

Read portals only. Never register, bid or submit.
""")

skill("tender-bid", "Qualifying a tender, go/no-go note, document pack, diary and post-award steps, with Sri Kumar.", r"""
# E7. Tender bid (Compliance and Legal with Sri Kumar)

1. Qualify: product, quantity, sites, duration, deposit (EMD), eligibility, payment terms, penalties.
2. Go / no-go note with margin and cash needed (assume 60-90 day payment; ask the Finance Controller). Sri Kumar and the board decide.
3. Document pack: registrations, FSSAI, financials, experience, declarations, price bid (the Revenue Lead proposes the price; the board approves it).
4. Diary: pre-bid meeting, submission deadline, opening date.
5. After award: performance guarantee (board approves), delivery schedule by site, inspection sign-off format, billing calendar.
6. Submission needs approval. Sri Kumar submits on the portal.
""")

skill("market-scan", "Monthly market, competitor and trend scan on the 5th: three opportunities and three threats, each with an action and owner.", r"""
# E8. Market scan (Analyst, 5th of each month)

Track:

- competitor retail and quick-commerce prices for the top 20 products (Hyderabad, Bangalore, Dubai);
- new competitor products and channels;
- Gulf import price trends for frozen mutton, chicken and shrimp;
- consumer and new-age trends;
- associations, events and partners worth meeting (Networking, Collaborations);
- subsidy and scheme deadlines from the Finance Controller's tracker.

Output: one page. Three opportunities and three threats, each with an action and an owner. Add the top 3 items for the AI & Automation backlog (what to automate next and the saving).

State the source and date of every price.
""")

skill("founder-daily-brief", "The 08:30 founder brief: the 12 numbers with red/amber/green, reds with owner and next step, approvals waiting with age, routines that did not report. Under 250 words.", r"""
# E9. Founder daily brief (Chief of Staff, 08:30)

Under 250 words. One screen.

## The 12 numbers

| # | Number | Target | Owner |
|---|---|---|---|
| 1 | Cash vs 4-week need | Never below 4 weeks | Finance Controller |
| 2 | Receivables over 30 days | Under 10% of book | Finance Controller |
| 3 | Landed cost per kg vs plan | Within 3% | Supply Planner |
| 4 | Processing yield by cut | At or above standard | Ops and Quality |
| 5 | Wastage + expiry + returns | Under 2% of sales | Ops and Quality |
| 6 | Cold-chain breaches | Zero | Ops and Quality |
| 7 | On-time in-full deliveries | Above 95% | Ops and Quality |
| 8 | Gross margin by channel | Reported weekly | Analyst |
| 9 | Orders and revenue by business | Daily trend | Analyst |
| 10 | New customers and repeat rate | Weekly view | B2B Sales Desk, B2C Growth |
| 11 | Complaints open over 24 hours | Zero | Customer Care |
| 12 | Licences expiring within 60 days | No surprises | Compliance and Legal |

## Format

1. Table: number, today, target, status (Green / Amber / Red). Every value carries its source.
2. **Reds**: one line each with owner and next step.
3. **Waiting for you**: every pending approval with its age.
4. **Missing**: any number not available, and the system that should have supplied it. A missing number means a system is not connected or a routine did not run. Open a task for the system owner.

## Escalations the Chief of Staff runs at the same time

- Any routine that did not report: open a task for its owner by 10:00.
- Any approval waiting more than 4 hours: remind the deputy board member.
""")

skill("monthly-business-review", "Monthly business review on the 2nd: one row per business with grow/fix/pause recommendation; plus quarterly product and strategy review.", r"""
# E10. Monthly business review (Chief of Staff, 2nd of the month)

One row per business (India B2B, India B2C, India B2G, Dubai B2B, Dubai B2C, Oman B2B, Maldives B2B):

Revenue, gross margin %, contribution after logistics and channel costs, customers, repeat rate, receivables over 30 days, complaints per 100 orders, top issue, recommendation (**Grow**, **Fix** or **Pause**). The board decides.

Add:

- active vs sold products;
- top and bottom 10 products by margin;
- AI spend vs budget per agent (from the Paperclip costs page);
- routines missed this month.

## Quarterly product and strategy review (7 Jan, Apr, Jul, Oct)

- Kill list: products under 5 orders a month move to "on request" (sku-master-governance).
- Priorities for the next quarter per business.
- Hires and agent changes to propose to the board (agents never hire).
""")
