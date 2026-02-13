#!/bin/bash
# =============================================================================
# Keepit Carnaval 2026 - Database Backup Script
# =============================================================================
# This script creates a backup of the Supabase database using pg_dump
#
# Prerequisites:
# - PostgreSQL client tools installed (pg_dump)
# - Database connection string from Supabase Dashboard
#
# Usage:
#   ./scripts/backup-database.sh
# =============================================================================

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/keepit_backup_${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Keepit Carnaval 2026 - Database Backup"
echo "=============================================="

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump is not installed${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Check for DATABASE_URL environment variable
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL not set.${NC}"
    echo ""
    echo "To get your database connection string:"
    echo "1. Go to Supabase Dashboard"
    echo "2. Project Settings > Database"
    echo "3. Connection string > URI"
    echo ""
    echo "Then run:"
    echo "  export DATABASE_URL='postgresql://...' && ./scripts/backup-database.sh"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo ""
echo "Starting backup..."
echo "Destination: $BACKUP_FILE"
echo ""

# Run pg_dump
pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --schema=public \
    --file="$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo ""
echo -e "${GREEN}Backup completed successfully!${NC}"
echo "File: ${BACKUP_FILE}.gz"
echo "Size: $(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')"
echo ""

# Keep only last 7 backups
echo "Cleaning old backups (keeping last 7)..."
ls -t "${BACKUP_DIR}"/keepit_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo ""
echo "=============================================="
echo "  Backup Complete"
echo "=============================================="
