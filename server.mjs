import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname,resolve,extname } from 'node:path';
import { fetchPublicPage } from './src/security.mjs';
import { extractSignals,createHeuristicReport, adaptReport,demoReport,offlineDialogue } from './src/engine.mjs';
import {enhanceReport,imageReport,converse} from './src/ai.mjs';
import { KNOWLEDGE, KNOWLEDGE_VERSION } from './src/knowledge.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4178);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const rate=new Map();
function send(res,code,obj){const data=JSON.stringify(obj);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(data);}
function clientKey(req){return req.socket.remoteAddress||'unknown';}
function quota(req,res){const key=clientKey(req),now=Date.now(),entry=rate.get(key);if(!entry||now-entry.start>600_000){rate.set(key,{start:now,count:1});return true;}entry.count++;if(entry.count>45){send(res,429,{error:'Too many requests. Please try again later.'});return false;}return true;}
async function jsonBody(req){let total=0;const chunks=[];for await(const part of req){total+=part.length;if(total>8_500_000){const e=new Error('The upload exceeds the 6 MB image limit.');e.status=413;throw e;}chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{const e=new Error('Invalid request format.');e.status=400;throw e;}}
const respondError=(res,e)=>send(res,e.status||(/URL|Enter|Upload|Invalid|public domain|web port|image/i.test(e.message)?400:502),{error:e.message||'Assessment could not be completed.'});
async function router(req,res){
 res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Content-Type-Options','nosniff');
 const path=new URL(req.url||'/', 'http://localhost').pathname;
 if(path==='/api/status'&&req.method==='GET')return send(res,200,{aiConfigured:!!process.env.OPENAI_API_KEY,knowledgeVersion:KNOWLEDGE_VERSION,knowledgeCount:KNOWLEDGE.length,description:'Local structure review works without an AI key. AI mode supports screenshots and richer dialogue.'});
 if(path==='/api/knowledge'&&req.method==='GET')return send(res,200,{version:KNOWLEDGE_VERSION,sources:KNOWLEDGE});
 if(path.startsWith('/api/')){
  if(req.method!=='POST')return send(res,405,{error:'Method not supported.'});
  if(!quota(req,res))return;
  try{
   const body=await jsonBody(req);
   if(path==='/api/assess'){
    if(body.mode==='demo')return send(res,200,{report:demoReport()});
    if(body.mode==='url'){
      const page=await fetchPublicPage(body.url);
      let report=createHeuristicReport(extractSignals(page.html,page.url));
      report.createdAt=page.capturedAt;
      if(process.env.OPENAI_API_KEY){try{report=await enhanceReport(report)}catch{report.limitations.push('AI enhancement was unavailable; the structural analysis remains available.')}}
      return send(res,200,{report});
    }
    if(body.mode==='image'){
      if(!process.env.OPENAI_API_KEY)return send(res,422,{error:'Screenshot interpretation requires a configured AI model. URL structure reviews and the guided sample work without a key.'});
      const report=await imageReport(body);return send(res,200,{report});
    }
    if(body.mode==='guided'){
      if(typeof body.challenge!=='string'||body.challenge.trim().length<20)return send(res,400,{error:'Please describe your business challenge in at least 20 characters.'});
      // No imagined observations. Create a clearly labeled discovery worksheet rather than a made-up diagnosis.
      const notes=body.challenge.trim().slice(0,1200);
      const report={id:`audit-${Date.now().toString(36)}`,createdAt:new Date().toISOString(),sample:false,title:'Guided discovery',scope:'Business context supplied by user',mode:'guided',engine:'discovery worksheet',summary:'The information supplied is a business challenge, not evidence of a design defect. The following review provides a hypothesis and a path to collect evidence before making changes.',evidence:[{id:'E1',label:'Business challenge',value:notes,type:'user statement'}],findings:[{id:'F1',area:'Business context',heading:'Translate the challenge into a testable design question',status:'hypothesis',priority:'medium',observation:`The business described: “${notes}”`,impact:'A clear problem statement will help decide which experience evidence matters.',recommendation:'Choose one user task related to this challenge. Gather a screenshot, a relevant page, or actual observed interactions before selecting a design solution.',validation:'Interview a relevant user or review a real task session. Compare the expected behavior with what actually happens.',evidenceIds:['E1'],frameworkIds:['SDS-CHOR','ATLAS-ASSIST']}],frameworkVersion:KNOWLEDGE_VERSION,context:{audience:'unknown',goal:'understand'},question:{title:'Who are you trying to help?',detail:'This helps determine the evidence we should collect.',options:[{id:'new',label:'New prospective customers'},{id:'existing',label:'Current customers or users'},{id:'both',label:'Both audiences'}]},limitations:['No website or visual artifact was supplied, so the report cannot diagnose actual design defects.','Business challenges are user-provided statements, not verified performance data.']};
      return send(res,200,{report});
    }
    return send(res,400,{error:'Unknown assessment mode.'});
   }
   if(path==='/api/refine'){
    if(!body.report||typeof body.report!=='object')return send(res,400,{error:'No report was supplied.'});
    return send(res,200,{report:adaptReport(body.report,body.audience)});
   }
   if(path==='/api/discuss'){
    if(typeof body.question!=='string'||!body.question.trim()||body.question.length>600||!body.report?.findings?.length)return send(res,400,{error:'Provide a question and an existing report.'});
    const answer=process.env.OPENAI_API_KEY?await converse(body.question,body.report):offlineDialogue(body.question,body.report);
    return send(res,200,{answer});
   }
   return send(res,404,{error:'Unknown API endpoint.'});
  }catch(e){return respondError(res,e);}
 }
 if(req.method!=='GET')return send(res,405,{error:'Method not supported.'});
 const file=path==='/'?'index.html':decodeURIComponent(path).replace(/^\//,'');
 if(!['index.html','app.js','styles.css','favicon.svg'].includes(file)){res.writeHead(404);return res.end('Not found');}
 try{const buf=await readFile(resolve(root,'public',file));res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(buf);}catch{res.writeHead(404);res.end('Not found');}
}
http.createServer((req,res)=>router(req,res).catch(e=>respondError(res,e))).listen(port,()=>console.log(`Design Intelligence Auditor → http://localhost:${port}`));
