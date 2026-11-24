---
name: daily-buy-plan
description: "SOP for the Supply Planner's daily 03:30 buy plan: confirmed orders plus expected demand, minus usable stock, converted to raw kg, split across suppliers, with landed cost and flags. Delivered by 04:00."
---

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
