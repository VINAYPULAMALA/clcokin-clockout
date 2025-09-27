#!/bin/bash
# Reset script for Staff Management System DB
# This will delete the old DB, recreate schema, apply triggers, and seed demo data.

DB_FILE="database.sqlite"
SCHEMA_FILE="schema.sql"
TRIGGERS_FILE="code_triggers.sql"
SEED_FILE="seed.sql"

echo "⚠️  Resetting database: $DB_FILE"

# Backup old DB if it exists
if [ -f "$DB_FILE" ]; then
  BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).sqlite"
  cp "$DB_FILE" "$BACKUP_FILE"
  echo "📦 Backup created: $BACKUP_FILE"
fi

# Remove old DB
rm -f "$DB_FILE"
echo "🗑️  Old database removed."

# Recreate schema
sqlite3 "$DB_FILE" < "$SCHEMA_FILE"
echo "✅ Schema created from $SCHEMA_FILE"

# Apply triggers (if file exists)
if [ -f "$TRIGGERS_FILE" ]; then
  sqlite3 "$DB_FILE" < "$TRIGGERS_FILE"
  echo "✅ Triggers applied from $TRIGGERS_FILE"
else
  echo "⚠️  No triggers file found ($TRIGGERS_FILE) - skipping"
fi

# Seed demo data
sqlite3 "$DB_FILE" < "$SEED_FILE"
echo "✅ Demo data seeded from $SEED_FILE"

echo "🎉 Database reset complete! -> $DB_FILE"
echo ""
echo "Demo users created:"
echo "  System Admin: admin / admin123"
echo "  Employee: johndoe / password123"