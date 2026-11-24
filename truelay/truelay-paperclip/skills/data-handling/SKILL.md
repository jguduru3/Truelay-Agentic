---
name: data-handling
description: "Truelay rules for data: one home per kind of data, customer-data privacy, opt-in messaging, source-and-time on every number, never delete. Also how to work from CSV files before systems are connected."
---

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
