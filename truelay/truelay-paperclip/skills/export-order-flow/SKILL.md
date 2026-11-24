---
name: export-order-flow
description: The end-to-end export order flow from buyer PO to payment, with Rajesh and Sai, and the daily 12:00 shipment watch.
---

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
