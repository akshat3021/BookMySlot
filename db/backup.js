require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupsDir, `bookmyslot_backup_${timestamp}.sql`);

const dbUser = process.env.DB_USER || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'bookmyslot';
const dbPass = process.env.DB_PASSWORD || '';

console.log(`Starting database backup for '${dbName}'...`);

// Command to execute pg_dump
const pgDumpCmd = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F p -f "${backupFile}"`;

const env = { ...process.env, PGPASSWORD: dbPass };

exec(pgDumpCmd, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
  console.log(`Database backup completed successfully!`);
  console.log(`Backup File Location: ${backupFile}`);
  console.log('\n--- Restore Instructions ---');
  console.log(`To restore this backup, run:`);
  console.log(`psql -U ${dbUser} -h ${dbHost} -d ${dbName} -f "${backupFile}"`);
});
