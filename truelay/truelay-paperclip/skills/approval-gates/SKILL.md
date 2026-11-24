---
name: approval-gates
description: The Truelay approval matrix and the exact steps an agent follows when an action needs a human decision. Read before any action that moves money, changes a price, releases goods or sends anything outside the company.
---

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
