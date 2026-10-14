import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

export function isPrivateIp(address) {
  const version = net.isIP(address);
  if (!version) return true;
  if (version === 6) {
    const v = address.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || /^fe[89ab]/.test(v) || v.startsWith('2001:db8:');
  }
  const oct = address.split('.').map(Number);
  const [a,b] = oct;
  return a===0 || a===10 || a===127 || a>=224 ||
    (a===100 && b>=64 && b<=127) || (a===169 && b===254) ||
    (a===172 && b>=16 && b<=31) || (a===192 && b===168) ||
    (a===192 && b===0) || (a===192 && b===0 && oct[2]===2) ||
    (a===198 && (b===18 || b===19 || b===51)) ||
    (a===203 && b===0 && oct[2]===113);
}

export async function validatePublicUrl(input, lookup = dns.lookup) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Enter a public website address.');
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a valid URL beginning with https://'); }
  if (!['https:','http:'].includes(url.protocol)) throw new Error('Only http and https URLs can be assessed.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.');
  if (url.port && !['80','443'].includes(url.port)) throw new Error('Only standard web ports are supported.');
  if (url.hostname.length > 253 || !url.hostname.includes('.') || /\.(local|internal|localhost|test|invalid)$/i.test(url.hostname)) throw new Error('Enter a public domain.');
  if (net.isIP(url.hostname) || url.hostname.toLowerCase()==='localhost') throw new Error('IP addresses and local hosts are not supported.');
  const addresses = await lookup(url.hostname, {all:true, verbatim:true});
  if (!addresses.length || addresses.some(({address})=>isPrivateIp(address))) throw new Error('That address does not resolve to a public website.');
  url.hash = '';
  return url;
}

/**
 * Connect using a DNS-verified address pinned for that request. This avoids the
 * classic 'check public DNS, resolve again during fetch' SSRF rebinding gap.
 * A public deployment should additionally isolate network egress.
 */
function requestPinned(url, address, family) {
  return new Promise((resolve,reject)=>{
    const library = url.protocol==='https:'?https:http;
    let ended=false;const fail=e=>{if(!ended){ended=true;reject(e)}};
    const req=library.request(url,{
      method:'GET',
      timeout:11000,
      headers:{'User-Agent':'SovereignDesignAuditor/0.1 (+evidence-based review)','Accept':'text/html,application/xhtml+xml'},
      lookup:(_hostname,_options,callback)=>callback(null,address,family)
    },res=>{
      if([301,302,303,307,308].includes(res.statusCode)){
        const redirect=res.headers.location;
        res.resume();ended=true;resolve({redirect});return;
      }
      if(res.statusCode<200||res.statusCode>=300){res.resume();fail(new Error(`The website returned HTTP ${res.statusCode}.`));return;}
      const type=res.headers['content-type']||'';
      if(type&&!/html|xml/i.test(type)){res.resume();fail(new Error('That address did not return a web page.'));return;}
      const parts=[];let count=0;
      res.on('data',chunk=>{
        count+=chunk.length;
        if(count>900_000){req.destroy(new Error('This page exceeds the prototype capture limit.'));return;}
        parts.push(chunk);
      });
      res.on('end',()=>{if(!ended){ended=true;resolve({html:Buffer.concat(parts).toString('utf8')})}});
      res.on('error',fail);
    });
    req.on('timeout',()=>req.destroy(new Error('The website took too long to respond.')));
    req.on('error',fail);
    req.end();
  });
}
export async function fetchPublicPage(input, opts={}) {
  const lookup=opts.lookup??dns.lookup;
  let url=await validatePublicUrl(input,lookup);
  for(let redirects=0;redirects<=2;redirects++){
    const addresses=await lookup(url.hostname,{all:true,verbatim:true});
    if(!addresses.length||addresses.some(({address})=>isPrivateIp(address)))throw new Error('The site did not resolve to a public address.');
    const {address,family}=addresses[0];
    const result=await requestPinned(url,address,family);
    if(result.redirect){
      if(redirects>=2)throw new Error('The website redirected too many times.');
      url=await validatePublicUrl(new URL(result.redirect,url).toString(),lookup);
      continue;
    }
    return {url:url.toString(),html:result.html,capturedAt:new Date().toISOString()};
  }
  throw new Error('The website could not be captured.');
}
