#!/usr/bin/env bash
# Create the Azure resources for Truelay EggBreak. Run from Azure Cloud Shell (bash)
# or any machine with the Azure CLI, after `az login` and `az account set -s <subscription>`.
#
# Creates, in Central India (Pune):
#   - resource group, virtual network with a VM subnet and a delegated database subnet
#   - Azure Database for PostgreSQL Flexible Server 17 (private access, 35-day backups)
#   - storage account with containers "paperclip-files" and "backups" (no public access)
#   - Ubuntu 24.04 VM with a system-assigned managed identity
#   - "Storage Blob Data Contributor" for the VM identity on the storage account
#
# Review the variables, then: bash truelay/deploy/azure-provision.sh
set -euo pipefail

LOCATION="${LOCATION:-centralindia}"
RG="${RG:-rg-truelay-eggbreak}"
VNET="vnet-truelay-eggbreak"
VM="vm-truelay-eggbreak"
VM_SIZE="${VM_SIZE:-Standard_D2s_v5}"          # 2 vCPU, 8 GB RAM
PG="${PG:-psql-truelay-eggbreak}"               # must be globally unique
PG_ADMIN="truelayadmin"
STORAGE="${STORAGE:-truelayeggbreak}"           # 3-24 lowercase letters/digits, globally unique
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519.pub}"
OFFICE_IP="${OFFICE_IP:-}"                      # e.g. 203.0.113.10 ; empty = SSH open to the internet (keys only)

: "${PG_PASSWORD:?export PG_PASSWORD first (16+ chars, letters, digits, symbols)}"
[ -f "$SSH_KEY" ] || { echo "SSH public key not found at $SSH_KEY (ssh-keygen -t ed25519)"; exit 1; }

echo "== Resource group"
az group create -n "$RG" -l "$LOCATION" -o none

echo "== Network"
az network vnet create -g "$RG" -n "$VNET" --address-prefix 10.40.0.0/16 \
  --subnet-name snet-vm --subnet-prefixes 10.40.1.0/24 -o none
az network vnet subnet create -g "$RG" --vnet-name "$VNET" -n snet-db \
  --address-prefixes 10.40.2.0/24 --delegations Microsoft.DBforPostgreSQL/flexibleServers -o none
az network private-dns zone create -g "$RG" -n "${PG}.private.postgres.database.azure.com" -o none
DNS_ZONE_ID="$(az network private-dns zone show -g "$RG" -n "${PG}.private.postgres.database.azure.com" --query id -o tsv)"

echo "== PostgreSQL Flexible Server (takes 5-10 minutes)"
az postgres flexible-server create -g "$RG" -n "$PG" -l "$LOCATION" \
  --tier Burstable --sku-name Standard_B2s --storage-size 64 --version 17 \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --vnet "$VNET" --subnet snet-db --private-dns-zone "$DNS_ZONE_ID" \
  --backup-retention 35 --yes -o none
# Paperclip's migrations create these two extensions; Azure only allows listed ones.
az postgres flexible-server parameter set -g "$RG" -s "$PG" \
  --name azure.extensions --value PG_TRGM,FUZZYSTRMATCH -o none
az postgres flexible-server db create -g "$RG" -s "$PG" -d paperclip -o none

echo "== Storage account and containers"
az storage account create -g "$RG" -n "$STORAGE" -l "$LOCATION" \
  --sku Standard_ZRS --kind StorageV2 --min-tls-version TLS1_2 \
  --allow-blob-public-access false -o none
STORAGE_ID="$(az storage account show -g "$RG" -n "$STORAGE" --query id -o tsv)"
ME="$(az ad signed-in-user show --query id -o tsv)"
az role assignment create --assignee-object-id "$ME" --assignee-principal-type User \
  --role "Storage Blob Data Contributor" --scope "$STORAGE_ID" -o none
echo "   waiting 60s for the role assignment to take effect"; sleep 60
az storage container create --account-name "$STORAGE" -n paperclip-files --auth-mode login -o none
az storage container create --account-name "$STORAGE" -n backups --auth-mode login -o none
az storage account management-policy create -g "$RG" --account-name "$STORAGE" \
  --policy @"$(dirname "$0")/blob-lifecycle-policy.json" -o none
az storage account blob-service-properties update -g "$RG" --account-name "$STORAGE" \
  --enable-delete-retention true --delete-retention-days 14 -o none

echo "== VM"
az vm create -g "$RG" -n "$VM" -l "$LOCATION" --image Ubuntu2404 --size "$VM_SIZE" \
  --admin-username azureuser --ssh-key-values "$SSH_KEY" \
  --vnet-name "$VNET" --subnet snet-vm --public-ip-sku Standard \
  --assign-identity --os-disk-size-gb 128 --nsg-rule SSH -o none
az vm open-port -g "$RG" -n "$VM" --port 80,443 --priority 900 -o none
if [ -n "$OFFICE_IP" ]; then
  NSG="$(az network nic show --ids "$(az vm show -g "$RG" -n "$VM" --query 'networkProfile.networkInterfaces[0].id' -o tsv)" --query 'networkSecurityGroup.id' -o tsv | xargs basename)"
  az network nsg rule update -g "$RG" --nsg-name "$NSG" -n default-allow-ssh --source-address-prefixes "$OFFICE_IP" -o none
fi
VM_PRINCIPAL="$(az vm show -g "$RG" -n "$VM" --query identity.principalId -o tsv)"
az role assignment create --assignee-object-id "$VM_PRINCIPAL" --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope "$STORAGE_ID" -o none

PUBLIC_IP="$(az vm show -d -g "$RG" -n "$VM" --query publicIps -o tsv)"
cat <<EOF

Done.
  VM public IP:        $PUBLIC_IP   (create DNS A record: eggbreak.truelay.in -> $PUBLIC_IP)
  SSH:                 ssh azureuser@$PUBLIC_IP
  DATABASE_URL:        postgres://$PG_ADMIN:<url-encoded password>@$PG.postgres.database.azure.com:5432/paperclip?sslmode=require
  Storage account:     $STORAGE (containers: paperclip-files, backups)
Next: CLOUD-SETUP-PLAN.md, phase 3.
EOF
