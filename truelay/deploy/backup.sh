#!/usr/bin/env bash
# Nightly off-site backup for Truelay EggBreak on Azure.
#
# Azure PostgreSQL already keeps point-in-time backups (set retention to 35 days),
# and uploaded files already live in Blob Storage. This script adds:
#   1. a nightly pg_dump of the database, and
#   2. a tar of the VM data volume (agent workspaces, secrets master key),
# copied to the "backups" Blob container with the VM's managed identity.
# A lifecycle rule on the storage account deletes backups older than 30 days.
#
# Install:
#   sudo cp truelay/deploy/backup.sh /usr/local/bin/truelay-backup && sudo chmod 750 /usr/local/bin/truelay-backup
#   sudo crontab -e   ->   30 1 * * * /usr/local/bin/truelay-backup >> /var/log/truelay-backup.log 2>&1
# 01:30 IST is outside the busy windows (03:30 buy plan, 08:30 brief).
set -euo pipefail

ENV_FILE="${ENV_FILE:-/home/azureuser/eggbreak/truelay/deploy/.env}"
set -a; . "$ENV_FILE"; set +a

STAMP="$(date +%Y-%m-%d_%H%M)"
WORK="$(mktemp -d /var/tmp/truelay-backup.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
PROJECT="truelay-eggbreak"
DEST="https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_BACKUP_CONTAINER}"

# 1. Database dump, using the same Postgres major version as the Azure server.
docker run --rm postgres:17-alpine pg_dump "$DATABASE_URL" -Fc > "$WORK/db-$STAMP.dump"

# 2. VM data volume.
docker run --rm -v "${PROJECT}_paperclip-data:/data:ro" -v "$WORK:/out" alpine \
  tar czf "/out/data-$STAMP.tgz" -C /data .

# 3. Copy to Blob with the VM's managed identity.
export AZCOPY_AUTO_LOGIN_TYPE=MSI
azcopy copy "$WORK/db-$STAMP.dump" "$DEST/db/db-$STAMP.dump" --log-level=WARNING
azcopy copy "$WORK/data-$STAMP.tgz" "$DEST/data/data-$STAMP.tgz" --log-level=WARNING

echo "$(date -Is) backup ok: db-$STAMP.dump data-$STAMP.tgz -> $DEST"
