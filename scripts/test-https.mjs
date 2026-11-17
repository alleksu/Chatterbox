import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {migrate} from '../db-migrations.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chatterbox-tls-'));
let child;
try {
 const openssl=process.env.OPENSSL || 'C:/Program Files/Git/usr/bin/openssl.exe';
 const cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem'),db=path.join(dir,'test.sqlite');
 const generated=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'pipe'});
 assert.equal(generated.status,0,'OpenSSL certificate generation');migrate(db);
 const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.js'],{env:{...process.env,HTTPS:'1',CHATTERBOX_HOST:'127.0.0.1',PORT:String(port),CHATTERBOX_DB_PATH:db,TLS_CERT:cert,TLS_KEY:key},stdio:'pipe'});
 let errors='';child.stderr.on('data',b=>errors+=b);child.stdout.resume();
 const request=(route,body,cookie,csrf,ca=fs.readFileSync(cert))=>new Promise((resolve,reject)=>{
  const req=https.request({hostname:'127.0.0.1',port,path:route,method:body?'POST':'GET',ca,timeout:5000,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(data)}));});req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('timeout')));req.end(body?JSON.stringify(body):undefined);
 });
 let ready=false;for(let i=0;i<60;i++){try{await request('/api/health');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(ready,errors);
 await assert.rejects(()=>request('/api/health',null,null,null,''));
 const anonymous=await request('/api/auth/session');assert.equal(anonymous.status,200);assert.deepEqual(anonymous.data,{user:null,csrfToken:null});assert.equal(anonymous.headers['cache-control'],'no-store');
 const registered=await request('/api/auth/register',{name:'TLS User',username:'tls_user',password:'a-secure-test-password'});assert.equal(registered.status,200);
 const cookie=registered.headers['set-cookie'][0];assert.match(cookie,/; Secure/);assert.match(cookie,/HttpOnly/);
 const session=cookie.split(';')[0];assert.equal((await request('/api/auth/me',null,session)).status,200);
 assert.deepEqual((await request('/api/auth/session',null,session)).data.user,registered.data.user);
 assert.equal((await request('/api/auth/logout',{},session)).status,403);
 assert.equal((await request('/api/auth/logout',{},session,registered.data.csrfToken)).status,200);
 assert.equal((await request('/api/auth/me',null,session)).status,401);
 assert.deepEqual((await request('/api/auth/session',null,session)).data,{user:null,csrfToken:null});
 console.log('PASS: verified TLS trust and certificate address, untrusted certificate rejection, Secure/HttpOnly cookies, HTTPS session, CSRF and logout');
} finally {
 if(child && child.exitCode===null) {child.kill();await new Promise(resolve=>child.once('exit',resolve));}
 fs.rmSync(dir,{recursive:true,force:true});
}
