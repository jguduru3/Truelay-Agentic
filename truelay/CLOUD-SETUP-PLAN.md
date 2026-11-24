# Truelay EggBreak: Azure Cloud Setup Plan

Version 2.0 · 23 Nov 2026 · Owner: setup person, approved by the founder

How to run Truelay EggBreak (this rebranded copy of Paperclip, with the Truelay company) on Microsoft Azure in India, using **Azure Database for PostgreSQL** for the database and **Azure Blob Storage** for files and backups, reachable by the board at `https://eggbreak.truelay.in`.

Code: `https://github.com/jguduru3/Automatic_Orginasition` (private).

## 1. Architecture

```
Board phones / laptops ──HTTPS──► Azure VM (Ubuntu 24.04, Central India)
                                   ├─ Caddy (HTTPS, port 443)
                                   ├─ Truelay EggBreak container (port 3100, localhost only)
                                   │    ├─ 11 agents run here as Claude Code sessions
                                   │    ├─ agent workspaces + secrets key → VM disk (Docker volume)
                                   │    └─ uploaded files → /mnt/truelay-files ──BlobFuse2──┐
                                   └─ nightly backup.sh ──azcopy──┐                          │
                                                                  ▼                          ▼
                              Azure Blob Storage (storage account, ZRS, no public access)
                                   ├─ container "paperclip-files"  (attachments, documents, assets)
                                   └─ container "backups"          (nightly DB dump + data volume; 30 days)

        Azure Database for PostgreSQL Flexible Server 17 (private network only, 35-day point-in-time restore)
```

Design choices:

| Choice | Why |
|---|---|
| **VM + Docker** rather than App Service or Container Apps | Paperclip runs agents as long-lived local processes with a working disk; a VM keeps that simple and predictable. |
| **Central India (Pune)** | Data stays in India; low latency for the team. South India (Chennai) is the alternative. |
| **PostgreSQL Flexible Server, private access** | Managed patches, automatic backups with point-in-time restore; no database port on the internet. |
| **Blob Storage through BlobFuse2** | Paperclip stores files either on local disk or in S3. Azure Blob is not S3-compatible, so the Blob container is mounted on the VM and Paperclip's local-disk storage writes into it. No Paperclip code change. |
| **Managed identity** for Blob | The VM signs in to Blob Storage with its Azure identity: no storage keys or SAS tokens on the server. |
| Agent workspaces on the **VM disk**, not on Blob | Agents run git, file edits and many small reads; a network-mounted blob is too slow and not safe for that. They are backed up nightly to Blob instead. |

## 2. Decisions and cost

| # | Decision | Recommendation |
|---|---|---|
| 1 | Azure subscription | Pay-as-you-go or your existing subscription; founder is Owner, setup person Contributor on the resource group only |
| 2 | Region | Central India |
| 3 | Web address | `eggbreak.truelay.in` (replace everywhere if your domain differs) |
| 4 | Names | Storage account `truelayeggbreak` and server `psql-truelay-eggbreak` must be globally unique; change in `azure-provision.sh` if taken |
| 5 | SSH access | Restrict to the office IP if it is fixed (`OFFICE_IP` in the script) |

Indicative monthly cost (check the Azure pricing calculator for Central India; prices change):

| Resource | Size | Approx. per month |
|---|---|---|
| VM | Standard_D2s_v5 (2 vCPU, 8 GB), 128 GB Premium SSD | $80-95 |
| PostgreSQL Flexible Server | Burstable B2s, 64 GB, 35-day backups | $35-50 |
| Blob Storage | ZRS, under 50 GB, plus operations | $2-5 |
| Public IP (Standard, static) | | about $4 |
| Anthropic usage (11 agents) | | $250 budget (account cap about $300) |
| **Total** | | **about $370-400 (about Rs 31,000-34,000)** |

Saving options once usage is known: 1-year reserved instance for the VM (about 35-40% less), or Standard_B2ms for the VM if CPU stays low.

## 3. Phases

| Phase | What | Who | Time |
|---|---|---|---|
| 0 | Subscription, domain, Anthropic key, decisions | Founder | 1 hour |
| 1 | Code in GitHub (done: `jguduru3/Automatic_Orginasition`) | — | — |
| 2 | Create Azure resources with `azure-provision.sh` | Setup person | 30-45 minutes |
| 3 | Prepare the VM: Docker, BlobFuse2, azcopy, Caddy | Setup person | 45 minutes |
| 4 | Build and start Truelay EggBreak | Setup person | 1-1.5 hours (first build is slow) |
| 5 | DNS, HTTPS, first login, close sign-up | Setup person + founder | 30 minutes |
| 6 | Import the Truelay company (paused) | Setup person | 30 minutes |
| 7 | Backups, monitoring, budget alerts, restore test | Setup person | 1 hour |
| 8 | Hand over to the go-live runbook (implementation guide, section 7) | Founder + setup person | Next day |

## 4. Steps

### Phase 0: accounts (founder)

1. Azure subscription with MFA on every admin account.
2. Anthropic Console: API key for "Truelay EggBreak"; organisation monthly limit about $300.
3. Confirm the domain and who manages its DNS.
4. GitHub: give the setup person access to `jguduru3/Automatic_Orginasition`. Keep the repository **private**.

### Phase 2: create the Azure resources

Open **Azure Cloud Shell (Bash)** in the portal, then:

```bash
git clone https://github.com/jguduru3/Automatic_Orginasition.git && cd Automatic_Orginasition
```

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
```

```bash
export PG_PASSWORD='<a strong password, 16+ characters>' OFFICE_IP='<office public IP or leave empty>'
```

```bash
bash truelay/deploy/azure-provision.sh
```

It prints the VM's public IP, the SSH command and the `DATABASE_URL` format. Store the Postgres password in the founder's password manager.

What it creates is listed at the top of the script. It also sets `azure.extensions = PG_TRGM,FUZZYSTRMATCH` on the database server; without that, Paperclip's migrations fail.

### Phase 3: prepare the VM

```bash
ssh azureuser@<VM public IP>
```

System updates, timezone, swap:

```bash
sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get install -y unattended-upgrades fail2ban git fuse3
```

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker azureuser
```

BlobFuse2 and azcopy (Microsoft packages):

```bash
wget -q https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb && sudo dpkg -i packages-microsoft-prod.deb && sudo apt-get update && sudo apt-get install -y blobfuse2
```

```bash
curl -sL https://aka.ms/downloadazcopy-v10-linux | tar xz && sudo cp azcopy_linux_amd64_*/azcopy /usr/local/bin/ && sudo chmod 755 /usr/local/bin/azcopy
```

Caddy:

```bash
sudo apt-get install -y caddy
```

Log out and back in (for the `docker` group), then get the code:

```bash
git clone https://github.com/jguduru3/Automatic_Orginasition.git ~/eggbreak && cd ~/eggbreak
```

Mount Blob Storage (edit the storage account name in `blobfuse2.yaml` first if you changed it):

```bash
echo user_allow_other | sudo tee -a /etc/fuse.conf
```

```bash
sudo mkdir -p /etc/blobfuse2 /mnt/truelay-files && sudo chown azureuser:azureuser /mnt/truelay-files && sudo cp truelay/deploy/blobfuse2.yaml /etc/blobfuse2/truelay.yaml
```

```bash
sudo cp truelay/deploy/blobfuse2-truelay.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now blobfuse2-truelay
```

Check the mount writes to Blob:

```bash
echo ok > /mnt/truelay-files/mount-test.txt && ls -l /mnt/truelay-files && rm /mnt/truelay-files/mount-test.txt
```

The file should also appear briefly in the portal under the storage account → Containers → `paperclip-files`.

### Phase 4: build and start

```bash
cp truelay/deploy/.env.example truelay/deploy/.env && chmod 600 truelay/deploy/.env
```

Fill in `truelay/deploy/.env`: `DATABASE_URL` from phase 2 (URL-encode special characters in the password), the Anthropic key, and two secrets generated with:

```bash
openssl rand -base64 48
```

Build and start. The first build compiles a Rust component and can take 30-60 minutes:

```bash
docker compose -f truelay/deploy/docker-compose.truelay.yml --env-file truelay/deploy/.env up -d --build
```

```bash
docker compose -p truelay-eggbreak logs -f server
```

On first start the server applies about 500 database migrations; wait until it reports it is listening, then:

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

### Phase 5: DNS, HTTPS, first login

1. DNS: **A record** `eggbreak.truelay.in` → the VM public IP.
2. HTTPS:

```bash
sudo cp truelay/deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

3. Open `https://eggbreak.truelay.in`: the **Truelay** sign-in page, tab titled "Truelay EggBreak".
4. The founder creates the first account. If the server log prints a `/board-claim/...` URL, open it while signed in to become the instance admin. The deputy creates theirs.
5. Close open sign-up: set `PAPERCLIP_AUTH_DISABLE_SIGN_UP=true` in `.env` and run the `up -d` command from phase 4 again. Invite everyone else from inside the app.
6. On each board phone: open the site → **Add to Home Screen** (installs as "Truelay").

### Phase 6: import the company

Follow the deployment guide, section 5, with the web import: **Company settings → Import**, upload `truelay/truelay-paperclip` as a zip, keep **Start imported agents and routines paused** ticked. You get the Truelay logo, 11 agents, 18 routines and 9 starter tasks, all paused. Confirm the $250 budget and invite the deputy.

Upload one test attachment to any task and check it appears in the `paperclip-files` container in the portal.

### Phase 7: backups, monitoring, alerts, restore test

1. **Database backups**: built into Azure PostgreSQL (35-day point-in-time restore, set by the script). Optional: enable geo-redundant backup in the portal for a copy outside the region.
2. **Nightly off-site copy**:

```bash
sudo cp truelay/deploy/backup.sh /usr/local/bin/truelay-backup && sudo chmod 750 /usr/local/bin/truelay-backup
```

Root crontab (`sudo crontab -e`): `30 1 * * * /usr/local/bin/truelay-backup >> /var/log/truelay-backup.log 2>&1`. Run it once by hand and check the `backups` container. The lifecycle rule moves backups to the cool tier after 7 days and deletes them after 30. Deleted blobs can be recovered for 14 days (soft delete).

3. **VM backup**: portal → VM → Backup → enable Azure Backup (daily, 7-30 days). This protects agent workspaces between nightly copies.
4. **Uptime**: Application Insights → Availability → Standard test on `https://eggbreak.truelay.in/api/health` every 5 minutes, alert by email and SMS to the setup person and founder.
5. **Resource alerts** (Azure Monitor): VM CPU above 80% for 30 minutes, VM disk above 85%, PostgreSQL storage above 80%, PostgreSQL CPU above 80%.
6. **Cost**: Cost Management → Budgets → monthly budget for the resource group (about $150) with alerts at 80% and 100%.
7. **Restore test** before go-live: restore the database to a new server with point-in-time restore, point a test container at it, check the company loads; then delete the test server. Record the date here.

### Phase 8: hand-over

Continue with the integration guide (connect systems, "ask first" policies, cold-chain webhook URL from `https://eggbreak.truelay.in`) and the go-live runbook in the implementation guide, section 7.

## 5. Updating

1. `sudo /usr/local/bin/truelay-backup`
2. `cd ~/eggbreak && git pull`
3. `docker compose -f truelay/deploy/docker-compose.truelay.yml --env-file truelay/deploy/.env up -d --build`
4. Check `/api/health` and that the next routine runs on time.

Never update between 03:00 and 09:30 IST.

**Pulling a new upstream Paperclip release:** add the upstream Paperclip repository as a second git remote, merge its release into `main`, resolve conflicts in the rebranded files (section 7), run the UI tests for those files, push, then update the server.

## 6. Rollback and recovery

| Problem | Action |
|---|---|
| Bad update | `git checkout <previous commit>` and rebuild. If migrations ran, restore the database to a point just before the update (point-in-time restore). |
| Database damaged or data deleted | Point-in-time restore to a new server (any minute in the last 35 days), then change `DATABASE_URL`. |
| Uploaded file deleted | Blob soft delete: restore it within 14 days from the portal. |
| VM lost | Restore from Azure Backup, or create a new VM (phases 3-5) and restore the latest `data-*.tgz` from the `backups` container into the `paperclip-data` volume. Files and database are unaffected because they live in Blob and PostgreSQL. |

## 7. What the rebrand changed

People see **Truelay EggBreak**: the Truelay wordmark on sign-in, the name in browser tabs, sign-in and invite screens, and the Truelay "T" as favicon and phone icon. The brand lives in `ui/src/lib/brand.ts`, `ui/src/components/BrandLockup.tsx`, `ui/public/brand/`, the favicon and app-icon files in `ui/public/`, `ui/index.html` and `ui/public/site.webmanifest`. Package names, the `paperclipai` command, `PAPERCLIP_*` settings and deeper help text keep the Paperclip name so upstream updates and imports keep working.

## 8. Security checklist

- [ ] Repository is private.
- [ ] NSG allows only 22 (restricted where possible), 80 and 443. Port 3100 is bound to localhost only.
- [ ] PostgreSQL has private access only; no public endpoint.
- [ ] Storage account: public blob access off, TLS 1.2 minimum, access only through the VM's managed identity and named admins.
- [ ] `.env` is `chmod 600` and never committed.
- [ ] Open sign-up closed after board accounts exist.
- [ ] MFA on every Azure, GitHub, Anthropic and domain account.
- [ ] Automatic OS updates on; container rebuilt monthly.
- [ ] Backups verified and restore tested.
- [ ] "Ask first" policies on every money-moving or outbound tool (integration guide, section 3).

## 9. Later improvement: native Azure Blob storage in Paperclip

BlobFuse2 keeps Paperclip unchanged. If file volume grows or you want to drop the mount, add an `azure_blob` storage provider to Paperclip (`server/src/storage/`, next to the S3 provider) using the Azure SDK and the VM's managed identity. It is about four methods (put, get with byte ranges, head, delete) plus configuration, settings and tests across the server, shared config and CLI.
