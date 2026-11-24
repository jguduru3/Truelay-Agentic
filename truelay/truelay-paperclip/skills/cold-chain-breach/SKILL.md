---
name: cold-chain-breach
description: "SOP for a cold room or vehicle temperature breach: hold batches at once, record the event, alert the QC lead, record the root cause."
---

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
