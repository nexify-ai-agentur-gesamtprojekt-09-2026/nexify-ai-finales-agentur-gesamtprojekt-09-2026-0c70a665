import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {contactAttempt,persistContactAttempt,readContactAttempt} from '../../web/lib/contact-attempt.ts';
test('uncertain retry and reload keep the same identifier without storing contact details',async()=>{
 const payload=JSON.stringify({name:'Synthetic example',email:'test@example.invalid',message:'Synthetic enquiry only'});
 const first=await contactAttempt(payload,null,webcrypto);
 const stored=JSON.stringify(first);
 assert.equal(stored.includes('Synthetic'),false);assert.equal(stored.includes('@'),false);
 assert.deepEqual(await contactAttempt(payload,readContactAttempt(stored),webcrypto),first);
 assert.notEqual((await contactAttempt(payload,null,webcrypto)).key,first.key);
 await assert.rejects(contactAttempt(payload+' ',first,webcrypto),/pending_request_changed/);
});
test('corrupt pending state cannot silently become a fresh submission',()=>{
 for(const value of ['null','{}','invalid',JSON.stringify({key:'short',fingerprint:'a'.repeat(64)}),JSON.stringify({key:'a'.repeat(20),fingerprint:'bad'})])assert.throws(()=>readContactAttempt(value),/unverifiable/);
 assert.equal(readContactAttempt(null),null);
});
test('blocked storage or a mismatching readback stops before any HTTP side effect',async()=>{
 const attempt=await contactAttempt('synthetic payload',null,webcrypto);
 for(const storage of [{setItem(){throw Error('blocked');},getItem(){return null;}},{setItem(){},getItem(){throw Error('blocked');}},{setItem(){},getItem(){return 'wrong';}}]){
  let calls=0;
  const submit=()=>{persistContactAttempt(storage,'attempt',attempt);calls++;};
  assert.throws(submit,/request_storage_unavailable/);assert.equal(calls,0);
 }
 let saved;const storage={setItem(key,value){saved=value;},getItem(){return saved;}};
 persistContactAttempt(storage,'attempt',attempt);assert.deepEqual(readContactAttempt(saved),attempt);
});
