import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {migrate,verifiedBackup,snapshot,verify} from '../db-migrations.mjs';
const dir=mkdtempSync(path.join(os.tmpdir(),'chatterbox-migration-'));
try {
 const file=path.join(dir,'legacy.sqlite');
 let db=new DatabaseSync(file);
 db.exec("CREATE TABLE schema_info(version INTEGER PRIMARY KEY); INSERT INTO schema_info VALUES(1); CREATE TABLE users(user_id TEXT PRIMARY KEY,name TEXT NOT NULL,full_name TEXT NOT NULL DEFAULT '',ip TEXT NOT NULL DEFAULT '',device TEXT NOT NULL DEFAULT '',credentials TEXT NOT NULL DEFAULT ''); INSERT INTO users(user_id,name) VALUES('legacy-user','Legacy User'); CREATE TABLE messages(message_id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(user_id),text TEXT); INSERT INTO messages VALUES('old-message','legacy-user','Preserve this');");
 const before=snapshot(db);db.close();
 const copy=await verifiedBackup(file); db=new DatabaseSync(copy,{readOnly:true});assert.deepEqual(snapshot(db),before);db.close();
 migrate(file);db=new DatabaseSync(file);verify(db);assert.equal(db.prepare('SELECT text FROM messages').get().text,'Preserve this');assert.equal(db.prepare('SELECT username FROM users').get().username,null);const once=snapshot(db);db.close();migrate(file);db=new DatabaseSync(file);assert.deepEqual(snapshot(db),once);db.exec('PRAGMA foreign_keys=ON');assert.throws(()=>db.prepare('INSERT INTO user_sessions VALUES(?,?,?,?)').run('bad','missing',0,1));db.close();
 const bad=path.join(dir,'failure.sqlite');db=new DatabaseSync(bad);db.exec("CREATE TABLE users(user_id TEXT PRIMARY KEY,name TEXT,username TEXT); INSERT INTO users VALUES('a','A','same'),('b','B','SAME')");const initial=snapshot(db);db.close();assert.throws(()=>migrate(bad));db=new DatabaseSync(bad);assert.deepEqual(snapshot(db),initial);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('users') WHERE name='password_hash'").get().n,0);db.close();
 console.log('PASS: verified backup, populated legacy preservation, repeatable migration, foreign keys, transactional rollback');
} finally {rmSync(dir,{recursive:true,force:true});}
