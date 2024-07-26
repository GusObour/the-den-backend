#!/bin/bash

# Variables
STAGING_URI="mongodb+srv://obourgod:XQkTD1iWnnteiChw@barbershop.t166ezr.mongodb.net/stagging?retryWrites=true&w=majority"
PRODUCTION_URI="mongodb+srv://obourgod:XQkTD1iWnnteiChw@barbershop.t166ezr.mongodb.net/producation?retryWrites=true&w=majority"
BACKUP_PATH="dbBackup"

# Dump data from staging
echo "Dumping data from staging database..."
mongodump --uri="$STAGING_URI" --out="$BACKUP_PATH"

# Restore data to production
echo "Restoring data to production database..."
mongorestore --uri="$PRODUCTION_URI" "$BACKUP_PATH"

echo "Data migration completed successfully!"
