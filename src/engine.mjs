import { relevantKnowledge, KNOWLEDGE_VERSION } from './knowledge.mjs';

export function decodeEntities(v='') {
  const known={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',copy:'©',mdash:'—',ndash:'–',hellip:'…',rsquo:'’'};
  return String(v).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,id)=>{
    if(id[0]==='#') {const code=id[1]?.toLowerCase()==='x'?parseInt(id.slice(2),16):Number(id.slice(1));return code>0&&code<=0x10ffff?String.fromCodePoint(code):match;}
    return known[id.toLowerCase()]??match;
  });
}
export function cleanText(v='') {
  return decodeEntities(v.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}
function getTagText(html,tag) {const m=html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,'gi'))??[];return m.map(x=>cleanText(x)).filter(Boolean).slice(0,24);}
function attr(tag,name){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rx=new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i');const m=tag.match(rx);return m?(m[1]??m[2]??m[3]??''):null;}
export function extractSignals(html,url){
 const noJs=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--([\s\S]*?)-->/g,' ');
 const title=getTagText(noJs,'title')[0]??'';
 const heads=getTagText(noJs,'h1');
 const h2=getTagText(noJs,'h2');
 const metas=[...noJs.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
 const description=metas.map(x=>/^(?:description)$/i.test(attr(x,'name')??'')?attr(x,'content'):'').find(Boolean)??'';
 const viewport=metas.some(x=>/viewport/i.test(attr(x,'name')??''));
 const images=[...noJs.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]).slice(0,200);
 const missingAlt=images.filter(t=>attr(t,'alt')===null).length;
 const blankAlt=images.filter(t=>attr(t,'alt')==='').length;
 const anchors=[...noJs.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].slice(0,400).map(m=>({text:cleanText(m[0]),href:attr(m[0].split('>')[0]+'>','href')})).filter(v=>v.text).slice(0,100);
 const buttons=getTagText(noJs,'button');
 const ctaTexts=[...new Set([...anchors.map(x=>x.text),...buttons])].filter(x=>/(contact|request|quote|book|demo|talk|shop|buy|schedule|pricing|start|consult|inquir|estimate|get in touch)/i.test(x)).slice(0,12);
 const forms=(noJs.match(/<form\b/gi)??[]).length;
 const nav=(noJs.match(/<nav\b/gi)??[]).length;
 const body=cleanText(noJs.replace(/<(?:header|footer|nav)\b[^>]*>[\s\S]*?<\/(?:header|footer|nav)>/gi,' ')).slice(0,18_000);
 const proofTerms=Array.from(new Set((body.match(/\b(testimonials?|case stud(?:y|ies)|client stories|customer stories|certifi(?:cation|ed)|projects?|trusted by|results|our work|success stories)\b/gi)??[]).map(x=>x.toLowerCase()))).slice(0,10);
 return {url,title,description:cleanText(description),h1:heads,h2,viewport,imageCount:images.length,missingAlt,blankAlt,ctaTexts,navCount:nav,formCount:forms,proofTerms,linkCount:anchors.length,bodyExcerpt:body.slice(0,2200),capturedAt:new Date().toISOString()};
}

const FRAMEWORK = [
  {area:'Positioning clarity',brief:'Does the page orient a first-time visitor?',source:'SDS-CHOR'},
  {area:'Buyer journey',brief:'Can a visitor identify the next relevant step?',source:'SDS-CHOR'},
  {area:'Credibility and proof',brief:'Can potential buyers verify what is claimed?',source:'SDS-INV'},
  {area:'Visual and content structure',brief:'Is the information ordered, readable and understandable?',source:'SDS-INV'}
];
export {FRAMEWORK};
const f=(id,area,heading,status,priority,observation,impact,recommendation,evidenceIds,validation)=>({id,area,heading,status,priority,observation,impact,recommendation,evidenceIds,validation,frameworkIds:relevantKnowledge(area)});

export function createHeuristicReport(signals,{sample=false}={}){
 const ev=[]; const add=(label,value)=>{const id=`E${ev.length+1}`;ev.push({id,label,value:String(value),type:'page observation'});return id;};
 const titleId=add('Page title',signals.title||'Not detected');
 const h1Id=add('Primary headings',signals.h1.length?signals.h1.join(' · '):'No H1 detected in returned HTML');
 const descId=add('Meta description',signals.description||'Not detected');
 const ctaId=add('Action labels',signals.ctaTexts.length?signals.ctaTexts.join(' · '):'No clear request/contact/quote labels detected in returned HTML');
 const proofId=add('Proof cues on inspected page',signals.proofTerms.length?signals.proofTerms.join(' · '):'No recognizable proof terms detected in returned HTML');
 const structureId=add('Document structure',`${signals.h1.length} H1 · ${signals.h2.length} H2 · ${signals.imageCount} images · ${signals.missingAlt} images missing alt attribute · ${signals.navCount} nav elements`);
 const findings=[];
 if(!signals.h1.length){
   findings.push(f('F1','Positioning clarity','The page may be missing its clearest point of orientation','observed','high','No primary H1 heading was detected in the returned HTML.','First-time visitors may need to infer the company’s value from scattered content.','Add a meaningful primary heading that communicates who the company helps and why its offer matters.',[h1Id,titleId],'Inspect the rendered page and confirm whether client-side rendering supplies the missing heading.'));
 }else if(signals.h1[0].length<22 || /^(welcome|home|hello|solutions|products|services|about us)$/i.test(signals.h1[0])){
   findings.push(f('F1','Positioning clarity','The primary message may need more context','potential','high',`The primary heading reads “${signals.h1[0]}”.`,'Visitors who do not know the company may need additional context before evaluating relevance.','Test a heading that pairs the offering with the buyer’s problem or desired outcome.',[h1Id,descId],'Ask unfamiliar buyers what they believe the company offers after viewing the first screen.'));
 }else{
   findings.push(f('F1','Positioning clarity','There is an identifiable starting point','observed','medium',`The page introduces itself with “${signals.h1[0]}”.`,'A primary heading helps orient first-time visitors, but relevance and comprehension still need validation.','Check whether the heading immediately connects the offer to the intended customer and business outcome.',[h1Id,titleId],'Conduct a short first-impression test with target customers.'));
 }
 if(!signals.ctaTexts.length){
  findings.push(f('F2','Buyer journey','The next buyer action may be difficult to locate','potential','high','No obvious request, contact, demo, or quote call-to-action labels were detected in the returned HTML.','A motivated prospect could need more effort to discover the next step.','Introduce a clear action appropriate to buyer readiness, such as “Request a quote” or “Discuss a project”.',[ctaId],'Check the rendered page for graphic or script-generated controls before acting.'));
 }else{
  findings.push(f('F2','Buyer journey','An action pathway is present, but intent needs checking','observed','medium',`Detected action labels: ${signals.ctaTexts.slice(0,4).join(', ')}.`,'Visible action labels provide a route to progress; placement and effectiveness cannot be inferred from HTML alone.','Test whether the primary action matches the decision a new visitor is ready to make.',[ctaId],'Walk through the actual inquiry journey and check analytics or usability sessions.'));
 }
 if(!signals.proofTerms.length){
  findings.push(f('F3','Credibility and proof','Consider whether enough evidence is visible to first-time buyers','hypothesis','medium','The captured page did not contain recognizable case-study, testimonial, or certification labels.','New buyers may require concrete proof before committing to an unfamiliar supplier.','Review whether examples, material outcomes, process evidence, and customer references are accessible where visitors need them.',[proofId],'Review other pages and ask customers which proof helped their decision.'));
 }else{
  findings.push(f('F3','Credibility and proof','Proof cues are present; their usefulness is still unverified','observed','medium',`The page references ${signals.proofTerms.slice(0,5).join(', ')}.`,'The presence of proof language does not establish its quality, accuracy, or persuasive value.','Connect proof to the claims it supports; use specific, verifiable examples and source labels.',[proofId],'Inspect the actual proof and validate whether customers find it relevant.'));
 }
 if(signals.missingAlt>0){
  findings.push(f('F4','Visual and content structure','Some images lack descriptive text alternatives','observed','medium',`${signals.missingAlt} of ${signals.imageCount} detected image tags have no alt attribute.`,'Important images may be less accessible to people using assistive technology.','Provide meaningful alternatives for informative images; reserve empty alt text for purely decorative images.',[structureId],'Review rendered image semantics and perform keyboard and screen-reader testing.'));
 }else if(signals.h1.length>1){
  findings.push(f('F4','Visual and content structure','The document uses multiple primary headings','observed','low',`The returned HTML contains ${signals.h1.length} H1 headings.`,'Heading structure may affect clarity depending on sections and semantic grouping.','Check whether one clear page-level headline and structured sections best serve the content.',[structureId],'Review the actual heading hierarchy with accessibility tools and assistive technology.'));
 }else{
  findings.push(f('F4','Visual and content structure','Review the relationship between headings and supporting content','hypothesis','low',`Detected ${signals.h2.length} secondary headings and ${signals.imageCount} image tags.`,'Document counts cannot reveal whether visual hierarchy feels clear when rendered.','Inspect the first screen, section transitions, and the balance between technical detail and business value.',[structureId],'Use screenshots or a walkthrough to assess rendered visual hierarchy.'));
 }
 const hostname=(()=>{try{return new URL(signals.url).hostname.replace(/^www\./,'')}catch{return 'your experience'}})();
 const summary='An initial review of the available page structure reveals opportunities to verify how first-time buyers understand the offer, find their next step, and recognize credible proof. These are review priorities, not measured business losses.';
 return {
  id:`audit-${Date.now().toString(36)}`,
  createdAt:new Date().toISOString(),
  sample,
  title:hostname,
  scope:signals.url,
  mode:'url',
  engine:'structure-review',
  summary,
  evidence:ev,
  signals: {title:signals.title,h1:signals.h1,description:signals.description,imageCount:signals.imageCount,missingAlt:signals.missingAlt,ctaTexts:signals.ctaTexts,formCount:signals.formCount},
  findings,
  frameworkVersion:KNOWLEDGE_VERSION,
  context:{audience:'unknown',goal:'understand'},
  question:{title:'Who matters most on this page?',detail:'The answer can change which improvements deserve attention first.',options:[{id:'new',label:'Prospective customers exploring us for the first time'},{id:'existing',label:'Existing customers looking for information'},{id:'both',label:'Both audiences are equally important'}]},
  limitations:['A single publicly accessible page was inspected; this is not a complete site audit.','HTML structure alone cannot validate rendered visuals, interaction behavior, accessibility compliance, or conversion performance.','Recommendations are hypotheses until checked against users, business constraints, or analytics.']
 };
}

export function adaptReport(report,audience){
 if(!['new','existing','both'].includes(audience)) throw new Error('Invalid audience');
 const copy=structuredClone(report);copy.context={...copy.context,audience};
 const rec={
   new:'Prioritize first-time buyer orientation: clarify the offer, connect capabilities to customer outcomes, and make the inquiry path easy to discover.',
   existing:'Prioritize efficient retrieval: surface specifications, resources, technical support, and repeat-order paths without hiding basic orientation.',
   both:'Provide clear routes for new buyers evaluating the company and existing customers accessing technical resources, without creating two disconnected experiences.'
 };
 copy.contextualRecommendation=rec[audience];
 copy.contextRationale='The visitor segment changes which information should be prioritized; it does not invalidate the original page observations.';
 copy.lastRevisedAt=new Date().toISOString();
 return copy;
}

export function demoReport(){
 const sig={url:'https://morrow-and-pine.example/',title:'Morrow & Pine | Precision Packaging',description:'Custom packaging production for ambitious brands',h1:['Precision meets possibility'],h2:['Our capabilities','Materials','Get in touch'],viewport:true,imageCount:11,missingAlt:4,blankAlt:1,ctaTexts:['Contact us'],formCount:1,navCount:1,linkCount:21,proofTerms:[],bodyExcerpt:'Precision packaging solutions and innovative manufacturing processes. Contact us for more information.'};
 const r=createHeuristicReport(sig,{sample:true});r.title='Morrow & Pine · Sample company';r.scope='Illustrative example — no live website was inspected';r.summary='This fictional manufacturing example demonstrates how an assessment can distinguish visible signals, hypotheses, and recommendations. No actual company was evaluated.';r.limitations.unshift('All company details and findings in this sample are fictional and for demonstration only.');return r;
}

export function reportMarkdown(r){
 const lines=[`# Design Intelligence Assessment — ${r.title}`,``,`${r.sample?'**Fictional demonstration — not a real audit**':'**Evidence-grounded initial assessment**'}`,``,`${r.summary}`,``,`Assessed: ${r.scope}`,`Generated: ${r.createdAt}`,`Engine: ${r.engine}`,`Knowledge pack: ${r.frameworkVersion}`,``,`## Findings`];
 for(const x of r.findings){lines.push(``,`### ${x.id}: ${x.heading}`,`Status: ${x.status} · Priority: ${x.priority}`,`Observation: ${x.observation}`,`Why it may matter: ${x.impact}`,`Recommendation: ${x.recommendation}`,`How to validate: ${x.validation}`,`Evidence references: ${x.evidenceIds.join(', ')}`,`Framework references: ${x.frameworkIds.join(', ')}`);}
 if(r.contextualRecommendation) lines.push('','## Context-informed priority',r.contextualRecommendation,r.contextRationale);
 lines.push('','## Evidence');for(const e of r.evidence)lines.push(`- ${e.id} — ${e.label}: ${e.value}`);
 lines.push('','## Limitations',...r.limitations.map(x=>`- ${x}`),'','This report is freely usable and does not require a purchase.');return lines.join('\n');
}

export function offlineDialogue(question,report){
 const q=question.toLowerCase();const first=report.findings[0];
 if(/(revenue|conversion rate|percent|sales|profit|roi|lost)/.test(q)) return {answer:'The inspected evidence does not establish financial impact or conversion rates. Those would require business metrics or observed customer behavior. The report identifies plausible friction points, not measured losses.',mode:'evidence-limited'};
 if(/(why|evidence|how do you know|proof)/.test(q)) return {answer:`The first observation is: ${first.observation} This is classified as ${first.status}. Its evidence is ${first.evidenceIds.join(', ')}; validation still needed: ${first.validation}`,mode:'structured'};
 if(/(priorit|first|start|where)/.test(q)) return {answer:`A practical first step: ${first.recommendation} Start by validating whether the intended audience experiences the issue. ${first.validation}`,mode:'structured'};
 if(/(implement|fix|action|change|improv)/.test(q)) return {answer:`The report suggests: ${first.recommendation} Confirm the business objective and the affected users first, then test the revised experience before measuring impact.`,mode:'structured'};
 return {answer:`I can explain the existing findings and their evidence, but open-ended consultation needs an AI model configured. One grounded observation is: ${first.observation} You can also choose the priority audience to refine the action plan.`,mode:'limited'};
}
