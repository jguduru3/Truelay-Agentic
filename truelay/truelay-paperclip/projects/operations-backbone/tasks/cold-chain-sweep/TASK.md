---
name: Cold-chain sweep
slug: cold-chain-sweep
assignee: ops-quality
project: operations-backbone
recurring: true
---

Read every cold room and vehicle logger since the last sweep (`cold-chain-breach` SOP). If all are in range, post one line. If not, hold the batches, mark urgent and alert the QC and floor lead.

Schedule: `0 */2 * * *` (Asia/Kolkata).
