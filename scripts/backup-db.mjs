import {verifiedBackup} from '../db-migrations.mjs';
console.log('Verified backup:', await verifiedBackup());
