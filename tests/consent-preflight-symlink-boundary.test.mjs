import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyConsentFile,verifyGuardedConsentFile} from '../scripts/verify-sensitive-consent-cutover.mjs';
test('R0: real SQLite preflight rejects symbolic link alias',t=>{
 const dir=mkdtempSync(join(tmpdir(),'sa-r0-'));
 try{
  const path=join(dir,'copy.sqlite'),alias=join(dir,'alias.sqlite'),db=new DatabaseSync(path);
  db.exec('CREATE TABLE profiles(user_id TEXT, public_church INT,sensitive_consent INT,sensitive_consent_version INT)');
  db.exec("INSERT INTO profiles VALUES ('u',0,0,0)");db.close();
  assert.equal(verifyConsentFile(path).safe,true);
  try{symlinkSync(path,alias,'file');}catch(e){if(e.code==='EPERM'){t.skip('link privilege');return;}throw e;}
  assert.throws(()=>verifyConsentFile(alias),/snapshot_file_required/);
  assert.throws(()=>verifyGuardedConsentFile(alias),/snapshot_file_required/);
  assert.equal(verifyConsentFile(path).safe,true);
 }finally{rmSync(dir,{force:true,recursive:true});}
});
