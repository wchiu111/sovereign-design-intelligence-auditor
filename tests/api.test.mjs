import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=45000+Math.floor(Math.random()*12000);
const base=`http://127.0.0.1:${port}`;
let processHandle;
before(async()=>{
 processHandle=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),OPENAI_API_KEY:''},stdio:'ignore'});
 for(let i=0;i<30;i++){
   try{const res=await fetch(base+'/api/status');if(res.ok)return;}catch{}
   await delay(90);
 }
 throw new Error('The test server did not start.');
});
after(()=>{processHandle?.kill()});
const post=async(path,obj)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});return {status:r.status,body:await r.json()}};
test('status reports the model and knowledge state without exposing secrets',async()=>{const r=await fetch(base+'/api/status');const obj=await r.json();assert.equal(obj.aiConfigured,false);assert.ok(obj.knowledgeCount>=5);assert.equal(obj.apiKey,undefined)});
test('full fictional sample works with no model configured',async()=>{const {body,status}=await post('/api/assess',{mode:'demo'});assert.equal(status,200);assert.equal(body.report.sample,true);assert.equal(body.report.findings.length,4);});
test('context refinement is non-destructive',async()=>{const {body:initial}=await post('/api/assess',{mode:'demo'});const {body,status}=await post('/api/refine',{report:initial.report,audience:'new'});assert.equal(status,200);assert.deepEqual(body.report.evidence,initial.report.evidence);assert.notEqual(body.report.contextualRecommendation,undefined);});
test('guided input creates discovery worksheet instead of fake site claims',async()=>{const {body,status}=await post('/api/assess',{mode:'guided',challenge:'Our buyers are unsure how to evaluate our services.'});assert.equal(status,200);assert.equal(body.report.findings[0].status,'hypothesis');assert.match(body.report.limitations.join(' '),/No website/);});
test('offline dialogue refuses unsupported ROI estimates',async()=>{const {body:initial}=await post('/api/assess',{mode:'demo'});const {body,status}=await post('/api/discuss',{report:initial.report,question:'How much revenue did we lose?'});assert.equal(status,200);assert.match(body.answer.answer,/does not establish financial impact/);});
test('no model means screenshot assessment fails transparently',async()=>{const {body,status}=await post('/api/assess',{mode:'image',imageData:'fake'});assert.equal(status,422);assert.match(body.error,/requires a configured AI model/);});
test('blocks local URL assessment',async()=>{const {body,status}=await post('/api/assess',{mode:'url',url:'http://localhost:4178/'});assert.equal(status,400);assert.match(body.error,/public domain|local hosts|standard web ports/);});
