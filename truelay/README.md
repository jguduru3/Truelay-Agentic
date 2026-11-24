# Truelay EggBreak

Truelay EggBreak is this copy of Paperclip, rebranded for Truelay (name, logo, icons), with the Truelay company ready to import.

Everything needed to run Truelay's 34 departments with about 9 people and 11 AI agents on Paperclip.

| File | What it is | Who reads it |
|---|---|---|
| [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md) | What we are building, people, master lists, go-live plan, approvals, KPIs | Founder, deputy, setup person |
| [CLOUD-SETUP-PLAN.md](CLOUD-SETUP-PLAN.md) | Azure plan: VM, PostgreSQL Flexible Server, Blob Storage; cost, steps, backups, rollback | Founder, setup person |
| [deploy/](deploy/) | Azure provisioning script, compose file, BlobFuse2 mount, HTTPS config, `.env` template, backup script | Setup person |
| [brand/](brand/) | Source logo, wordmark and company logo | Setup person |
| [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) | Install Paperclip, HTTPS, import the company, backups, updates | Setup person |
| [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) | Connect ERP, accounting, CRM, cold-chain loggers, WhatsApp/email, drive; "ask first" tools | Setup person |
| [truelay-paperclip/](truelay-paperclip/) | The importable Paperclip company package | Paperclip (import) |
| [tools/](tools/) | Generator for the package: `gen_skills.py` (the 28 SOPs) and `gen_package.py` (agents, projects, routines, settings) | Setup person, when SOPs change |

Regenerate the package after editing the generator:

```bash
python truelay/tools/gen_package.py truelay/truelay-paperclip
```

Sources: *Truelay × Paperclip — Master Design* v1.0 and *Truelay AI Operations — Master Implementation Files* (23 Nov 2026). Where they disagree (one-day launch vs four waves), the implementation guide explains both and recommends one.

## Order of work

1. Read the implementation guide, sections 1-6, and make the decisions in section 6.
2. Follow the cloud setup plan (or the deployment guide for other options) to install and import `truelay-paperclip` (everything lands paused).
3. Follow the integration guide to connect systems and set "ask first" policies.
4. Go live with the implementation guide, section 7.
