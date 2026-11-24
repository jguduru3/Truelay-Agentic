# Truelay on Paperclip: Deployment Guide

Version 1.0 · 23 Nov 2026 · For the setup person

This guide installs Paperclip on a server, imports the Truelay company and makes it reachable from the founder's phone. Allow half a day for the first install.

Read the other two guides next:

- [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md): connecting ERP, accounting, CRM, cold-chain loggers, WhatsApp/email and the shared drive.
- [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md): launch day, people, master lists, approvals, KPIs.

---

## 1. What you are deploying

```
Founder / board phone & laptop ──HTTPS──► Paperclip (board UI + API, port 3100)
                                               │  embedded PostgreSQL (or your own Postgres)
                                               │  scheduler: 48 routines in Asia/Kolkata
                                               ▼
                                     11 Claude Code agents (claude_local adapter)
                                               │
                         ┌─────────────────────┼──────────────────────┐
                    ERP / stock          Accounting            CRM, WhatsApp, Drive
                 (Zoho/Odoo/ERPNext)   (Tally / Zoho Books)    cold-chain loggers
```

- Paperclip is the control plane. It stores the company, agents, tasks, approvals, budgets and the audit log.
- Each agent runs as a Claude Code session on the same machine (`claude_local` adapter), wakes on its routine or when a task is assigned, works, and goes back to sleep. Timer heartbeats are off.
- Your business systems keep the data. Agents read them through connections (see the integration guide), or from CSV files until a system is connected.

## 2. Choose where to run it

| Option | When to choose it | Cost |
|---|---|---|
| **A. Small cloud server (recommended)** | Board approves from phones outside the office; webhooks from loggers and WhatsApp must reach it | 2 vCPU, 4-8 GB RAM, 60 GB SSD. About Rs 1,500-3,500 a month (AWS Lightsail Mumbai, DigitalOcean Bangalore, Hetzner) |
| B. Office computer | Testing, or the board only approves from the office network | Existing hardware; must stay on 24x7 (the buy plan runs at 03:30) |

Rule of thumb: the 03:30 buy plan and the 2-hourly cold-chain sweep must never miss. Pick a machine that never sleeps, with UPS power. Use an Asia region so the IST schedule and latency are natural.

Requirements:

- Ubuntu 22.04/24.04 LTS (or Windows 10/11 for option B)
- Node.js 24.11 or newer
- A domain or subdomain you control, for example `ops.truelay.in` (option A)
- An Anthropic account with a monthly spend cap (Console → Limits). Set the cap to about $300 so the $250 agent budget has headroom.

## 3. Install

### Option A1: Docker (simplest on a server)

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
```

```bash
git clone <your fork or copy of this repository> paperclip && cd paperclip
```

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # do not commit this anywhere
```

```bash
docker compose -f docker/docker-compose.quickstart.yml up -d --build
```

Data persists under `./data/docker-paperclip` (database, uploads, secrets key, agent workspaces). Back this folder up (section 7). The image already contains the `claude` CLI that the `claude_local` adapter uses.

### Option A2: Node directly (no Docker)

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt-get install -y nodejs
```

```bash
npm install -g @anthropic-ai/claude-code
```

```bash
npx paperclipai onboard --yes
```

During onboarding choose **authenticated → public** if the board will reach it over the internet, or **authenticated → private** for Tailscale/VPN only. Do not use `local_trusted` on a server: it has no login.

Run it as a service so it restarts on reboot:

```bash
npx paperclipai service install
```

### Option B: Office Windows PC

1. Install Node.js 24 LTS from nodejs.org.
2. In PowerShell: `npm install -g @anthropic-ai/claude-code`, then `npx paperclipai onboard --yes`.
3. In Windows power settings, set sleep to **Never** and keep the PC on a UPS.
4. For phone access, install Tailscale on the PC and on the board's phones and choose **authenticated → private** in onboarding.

**Windows problems found while testing this package on the office PC:**

- **Database will not start ("could not bind ... Permission denied" on port 54329).** Windows reserves blocks of ports for Hyper-V/WSL. Check with `netsh int ipv4 show excludedportrange protocol=tcp`. On the test PC, 54278-54377 was reserved, which includes Paperclip's default database port 54329. Fix: run `npx paperclipai configure --section database` and choose a free port outside every listed range (for example 55432).
- **Local connections time out even though the port is listening.** On the test PC, connections to `127.0.0.1` timed out from every process, so the server could not reach its own database. This is a firewall or antivirus product filtering loopback traffic. Ask whoever manages the PC to allow loopback connections for `node.exe` and `postgres.exe`. This is a strong reason to prefer the cloud server (option A).
- **`pnpm install` ends with "EPERM: operation not permitted, symlink".** Turn on Windows **Developer Mode** (Settings → System → For developers) so non-admin users can create symlinks, then run `pnpm install` again. It only affects optional plugin development links; the server still runs without it.

### Running from this repository (the copy with the Truelay changes)

This repository adds a `--pause-automations` flag to `paperclipai company import` (see section 5). Until that change is in a published release, run the CLI from this copy:

```bash
pnpm install
```

```bash
pnpm build
```

```bash
pnpm paperclipai run
```

## 4. HTTPS and the public URL (option A)

Put Caddy in front of Paperclip so phones and webhooks use HTTPS:

```bash
sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
ops.truelay.in {
    reverse_proxy 127.0.0.1:3100
}
```

```bash
sudo systemctl reload caddy
```

Then tell Paperclip its public address (in the service environment or `.env`):

```
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
PAPERCLIP_PUBLIC_URL=https://ops.truelay.in
PAPERCLIP_BIND=loopback
```

`PAPERCLIP_PUBLIC_URL` matters: routine webhook URLs (the cold-chain alert) are generated from it.

Check the install:

```bash
npx paperclipai doctor
```

Fix every failure `doctor` reports before going on.

## 5. Create the board and import Truelay

1. Open `https://ops.truelay.in`, sign up as the founder. On first start, if the server prints a `/board-claim/...` URL, open it while signed in to become the instance admin.
2. Invite the deputy board member (Company settings → Members) once the company exists.

### Import with the web UI (recommended)

1. **Company settings → Import**, choose **Upload folder** (or zip the `truelay-paperclip` folder and upload the zip).
2. Check the preview: 11 agents, 28 skills, 9 projects, 48 routines, 9 starter tasks.
3. Keep **Start imported agents and routines paused** ticked (it is on by default). Everything lands paused.
4. Enter secrets when asked. `ANTHROPIC_API_KEY` is optional per agent: leave it empty to use the key already on the server. Leave system tokens empty until each system is connected (integration guide).
5. Import.

### Import with the CLI

```bash
pnpm paperclipai company import ./truelay/truelay-paperclip --target new --dry-run
```

```bash
pnpm paperclipai company import ./truelay/truelay-paperclip --target new --pause-automations --yes
```

`--pause-automations` is the flag this repository adds. Without it the CLI imports agents and routines **active**, and the 03:30 buy plan would start running before the systems and master lists are ready. The CLI does not ask for secret values; set them afterwards on each agent's **Environment** tab, or use the web UI import.

### What the import sets up

| Setting | Value | Where it comes from |
|---|---|---|
| Board approval for new agents | On | `.paperclip.yaml → company.requireBoardApprovalForNewAgents` |
| CEO agent can create agents | Off (all agents) | `agents.*.permissions.canCreateAgents: false` |
| Agent budgets | $250/month total; warn at 80%, pause at 100% | `agents.*.budgetMonthlyCents` |
| Timer heartbeat | Off; wake on routine or assignment only | `agents.*.runtime.heartbeat` |
| Models | Sonnet 5.5 for judgment roles, Haiku 4.5 for high-frequency roles | `agents.*.adapter.config.model` |
| Routines | 47 schedules in Asia/Kolkata + 1 webhook (cold-chain alert) | `routines` |

## 6. Turn on the server-level safety settings

1. **Company settings → Budget**: confirm the company monthly budget is $250 (25,000 cents). Per-agent budgets come from the import.
2. **Anthropic Console → Limits**: set the organisation monthly cap (about $300).
3. **Instance settings → Backups**: confirm automatic backups are on (default: hourly, kept 30 days).
4. **Members**: the founder and the deputy are board members. Nobody else gets board access.

## 7. Backups and restore

Automatic logical backups run hourly by default and are kept for 30 days under `~/.paperclip/instances/default/data/backups` (Docker: inside `./data/docker-paperclip`).

Manual backup before any change:

```bash
pnpm paperclipai db:backup
```

Off-site copy every night (example with rclone to Google Drive):

```bash
rclone sync ~/.paperclip/instances/default/data/backups gdrive:truelay-paperclip-backups
```

Also back up the secrets key file (`~/.paperclip/instances/default/secrets/master.key`) separately and securely. Without it, stored secrets cannot be decrypted after a restore.

Test a restore once a quarter on a spare machine.

## 8. Updating Paperclip

1. `pnpm paperclipai db:backup`.
2. Pull the new version (`git pull`, or `docker compose ... up -d --build`).
3. `npx paperclipai doctor`.
4. Open the board and check that the next routine runs on time.

Update outside the busy windows: not between 03:00 and 09:30 IST.

## 9. Updating Truelay's SOPs and agents later

The package in `truelay/truelay-paperclip` is generated by `truelay/tools/gen_package.py` from `truelay/tools/gen_skills.py`.

- **Small edits** (a threshold, a step): edit the skill in Paperclip directly (**Skills** page). That is the live copy.
- **Bigger changes**: edit the generator, run `python truelay/tools/gen_package.py truelay/truelay-paperclip`, then re-import into the existing company with `--target existing --collision replace` after a backup. Re-importing replaces agents' instructions and skills with the package version, so first copy any edits made in the UI back into the generator.

## 10. Security checklist

- [ ] Deployment mode is `authenticated`, never `local_trusted`, on any machine reachable by others.
- [ ] HTTPS on the public URL.
- [ ] Only the founder and deputy have board access.
- [ ] `ANTHROPIC_API_KEY` and system tokens are stored as Paperclip secrets, never in tasks, files or git.
- [ ] Anthropic monthly cap set.
- [ ] Backups on, copied off-site, secrets key backed up separately.
- [ ] Every connected tool that pays, refunds, bulk-sends, submits to a portal, adjusts stock or releases a batch has a **require approval** policy (integration guide, section 3).
- [ ] Server OS updates on (`unattended-upgrades`).

## 11. Troubleshooting

| Symptom | Check |
|---|---|
| A routine did not run | Is the agent paused? Is the routine paused? Is the agent over budget (paused at 100%)? Routine detail shows the last run. |
| Agent run fails at start | Agent → **Run environment test**. Usually a missing `claude` CLI or missing `ANTHROPIC_API_KEY`. |
| Founder brief has "missing" numbers | A system is not connected or its CSV under `data/<system>/` is older than 24 hours. |
| Times are off by 5:30 hours | Routine timezone must be `Asia/Kolkata` (the import sets it). |
| Webhook from loggers returns 401 | Wrong bearer secret. Rotate the trigger secret and update the logger platform. |
| Webhook returns 403 | Hostname not allowed. Set `PAPERCLIP_PUBLIC_URL` correctly; for private mode add the hostname with `npx paperclipai allowed-hostname <host>`. |
| Costs rising fast | **Costs** page by agent. Lower `maxTurnsPerRun`, move an agent to Haiku, or reduce routine frequency. |
