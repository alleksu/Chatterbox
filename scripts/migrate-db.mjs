import fs from 'node:fs';
import {databasePath,verifiedBackup,migrate} from '../db-migrations.mjs';
if(fs.existsSync(databasePath)) console.log('Verified backup:', await verifiedBackup());
migrate();
console.log('Database schema verified at version 2.');
