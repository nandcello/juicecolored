// Independent client for the Xiaomi Home app protocol. See THIRD_PARTY.md.
const enc=new TextEncoder(),dec=new TextDecoder();
export const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const unb64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const hash=async(algorithm,data)=>new Uint8Array(await crypto.subtle.digest(algorithm,data));
export function rc4(key,input,drop=1024){
  const box=Uint8Array.from({length:256},(_,i)=>i);let j=0;
  for(let i=0;i<256;i++){j=(j+box[i]+key[i%key.length])&255;[box[i],box[j]]=[box[j],box[i]];}
  let i=0;j=0;const next=()=>{i=(i+1)&255;j=(j+box[i])&255;[box[i],box[j]]=[box[j],box[i]];return box[(box[i]+box[j])&255];};
  for(let n=0;n<drop;n++)next();return Uint8Array.from(input,v=>v^next());
}
export async function signedParams(path,data,security,nonce){
  if(!nonce){nonce=crypto.getRandomValues(new Uint8Array(12));new DataView(nonce.buffer).setUint32(8,Math.floor(Date.now()/60000));}
  const secret=unb64(security),combined=new Uint8Array(secret.length+nonce.length);combined.set(secret);combined.set(nonce,secret.length);
  const signed=await hash('SHA-256',combined),signed64=b64(signed);
  const signature=async params=>b64(await hash('SHA-1',enc.encode(['POST',path,...Object.entries(params).map(([k,v])=>`${k}=${v}`),signed64].join('&'))));
  const plain={data:JSON.stringify(data)};plain.rc4_hash__=await signature(plain);
  const encrypted=Object.fromEntries(Object.entries(plain).map(([k,v])=>[k,b64(rc4(signed,enc.encode(v)))]));
  return {fields:{...encrypted,signature:await signature(encrypted),ssecurity:security,_nonce:b64(nonce)},key:signed};
}
const REGION_HOST={sg:'sg.api.io.mi.com',cn:'api.io.mi.com',de:'de.api.io.mi.com',us:'us.api.io.mi.com',ru:'ru.api.io.mi.com',in:'in.api.io.mi.com',i2:'i2.api.io.mi.com',tw:'tw.api.io.mi.com'};
const ALLOWED=new Set(['account.xiaomi.com','sts.api.io.mi.com',...Object.values(REGION_HOST)]);
export function safeURL(value){const url=new URL(value,'https://account.xiaomi.com');if(url.protocol!=='https:'||url.username||url.password||url.port||(!ALLOWED.has(url.hostname)&&!url.hostname.endsWith('.account.xiaomi.com')))throw new Error('Xiaomi returned an unexpected address. Please reconnect.');return url;}
export class XiaomiClient {
  constructor(session={}){this.session=session;this.session.cookies??=[];this.session.agent??='Mozilla/5.0 APP/com.xiaomi.mihome APPV/10.5.201';}
  async request(value,options={},timeout=15000){
    let url=safeURL(value);let res;
    for(let redirects=0;redirects<5;redirects++){
      const cookies=this.session.cookies.filter(c=>(url.hostname===c.domain||url.hostname.endsWith('.'+c.domain))&&url.pathname.startsWith(c.path||'/')).map(c=>`${c.name}=${c.value}`).join('; ');
      res=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':this.session.agent,...(cookies?{'Cookie':cookies}:{}),...options.headers}});
      const setCookies=res.headers.getSetCookie?.()??res.headers.getAll?.('set-cookie')??(res.headers.get('set-cookie')||'').split(/,(?=\s*[^;,=]+=[^;,]*)/).filter(Boolean);
      for(const raw of setCookies){
        const parts=raw.split(';'),at=parts[0].indexOf('=');if(at<1)continue;
        const cookie={name:parts[0].slice(0,at).trim(),value:parts[0].slice(at+1),domain:url.hostname,path:'/'};
        for(const part of parts.slice(1)){const [key,...rest]=part.trim().split('=');if(key.toLowerCase()==='domain')cookie.domain=rest.join('=').replace(/^\./,'');if(key.toLowerCase()==='path')cookie.path=rest.join('=');}
        if(!(url.hostname===cookie.domain||url.hostname.endsWith('.'+cookie.domain)))continue;
        this.session.cookies=this.session.cookies.filter(c=>!(c.name===cookie.name&&c.domain===cookie.domain&&c.path===cookie.path));this.session.cookies.push(cookie);
      }
      if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){url=safeURL(new URL(res.headers.get('location'),url).href);await res.body?.cancel();continue;}
      return res;
    }
    throw new Error('Xiaomi sign-in redirected too many times. Please try again.');
  }
  async startQR(region='sg'){
    if(!REGION_HOST[region])throw new Error('Choose a supported Xiaomi region.');
    this.session.region=region;
    const query=new URLSearchParams({_qrsize:'300',qs:'%3Fsid%3Dxiaomiio%26_json%3Dtrue',callback:'https://sts.api.io.mi.com/sts',_hasLogo:'false',sid:'xiaomiio',serviceParam:'',_locale:'en_US',_dc:String(Date.now())});
    const response=await this.request('https://account.xiaomi.com/longPolling/loginUrl?'+query);
    if(!response.ok)throw new Error(`Xiaomi sign-in is unavailable (${response.status}). Try again shortly.`);
    let data;try{data=JSON.parse((await response.text()).replace(/^&&&START&&&/,''));}catch{throw new Error('Xiaomi did not return a sign-in code. Please try again.');}
    if(!data.qr||!data.lp||!data.loginUrl)throw new Error('Xiaomi could not create a sign-in code. Try again shortly.');
    this.session.qr=safeURL(data.qr).href;this.session.poll=safeURL(data.lp).href;this.session.loginUrl=safeURL(data.loginUrl).href;
    this.session.expires=Date.now()+Math.min(Number(data.timeout)||180,300)*1000;
    return this.session;
  }
  async pollQR(){
    if(Date.now()>this.session.expires)throw new Error('This QR code expired. Create a new one.');
    let response;try{response=await this.request(this.session.poll,{},20000);}catch(e){if(e.name==='TimeoutError'||e.name==='AbortError')return false;throw e;}
    if(response.status===408)return false;
    if(!response.ok)throw new Error(`Xiaomi sign-in returned ${response.status}. Create a new QR code.`);
    let data;try{data=JSON.parse((await response.text()).replace(/^&&&START&&&/,''));}catch{throw new Error('Xiaomi returned an unreadable sign-in response. Create a new QR code.');}
    if(!data.ssecurity||!data.userId||!data.location){if(data.code===0||data.code===70016)return false;throw new Error('Sign-in was not completed. Create a new QR code and approve it in Xiaomi Home.');}
    this.session.userId=String(data.userId);this.session.ssecurity=data.ssecurity;
    const response2=await this.request(data.location);
    const cookie=this.session.cookies.find(c=>c.name==='serviceToken'&&c.domain.endsWith('mi.com'));
    if(!response2.ok||!cookie?.value)throw new Error('Xiaomi did not finish authorizing this server. Please reconnect.');
    this.session.serviceToken=cookie.value;
    // Keep only credentials required for cloud requests; discard temporary sign-in cookies and poll URLs.
    this.session={userId:this.session.userId,ssecurity:this.session.ssecurity,serviceToken:this.session.serviceToken,region:this.session.region,agent:this.session.agent,connectedAt:new Date().toISOString()};
    return true;
  }
  async api(path,data){
    if(!this.session.serviceToken)throw new Error('Connect your Xiaomi Home account first.');
    const host=REGION_HOST[this.session.region];if(!host)throw new Error('Invalid cloud region.');
    const {fields,key}=await signedParams(path,data,this.session.ssecurity);
    const response=await fetch(`https://${host}/app${path}`,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':this.session.agent,'Content-Type':'application/x-www-form-urlencoded','MIOT-ENCRYPT-ALGORITHM':'ENCRYPT-RC4','x-xiaomi-protocal-flag-cli':'PROTOCAL-HTTP2','Cookie':`userId=${this.session.userId}; serviceToken=${this.session.serviceToken}; yetAnotherServiceToken=${this.session.serviceToken}; locale=en_US; timezone=GMT%2B08%3A00; is_daylight=0; dst_offset=0; channel=MI_APP_STORE`},body:new URLSearchParams(fields)});
    if(response.status>=300&&response.status<400){await response.body?.cancel();throw new Error('Xiaomi returned an unexpected redirect. Reconnect your account if this persists.');}
    if([401,403].includes(response.status))throw new Error('Xiaomi authorization expired or was rejected. Reconnect your Xiaomi Home account.');
    if(!response.ok)throw new Error(`Xiaomi cloud is unavailable (${response.status}). Try again shortly.`);
    const text=await response.text();let result;
    try{result=JSON.parse(text);}catch{try{result=JSON.parse(dec.decode(rc4(key,unb64(text))));}catch{throw new Error('Cannot read Xiaomi’s response. Reconnect your Xiaomi Home account.');}}
    if(result.code&&result.code!==0)throw new Error([2,3].includes(result.code)?'Xiaomi authorization expired. Reconnect your account.':`Xiaomi rejected the request (code ${result.code}).`);
    return result.result;
  }
  async devices(){
    let rows=[];
    try{const result=await this.api('/home/device_list',{getVirtualModel:true,getHuamiDevices:0});rows=result?.list||[];}catch(error){if(/authorization/.test(error.message))throw error;}
    if(!rows.length){
      const homes=await this.api('/v2/homeroom/gethome',{fg:true,fetch_share:true,fetch_share_dev:true,limit:300,app_ver:7});
      for(const home of (homes?.homelist||[]).slice(0,15)){
        const result=await this.api('/v2/home/home_device_list',{home_owner:home.uid||this.session.userId,home_id:home.id,limit:200,get_split_device:true,support_smart_home:true});rows.push(...(result?.device_info||[]));
      }
    }
    const bulbs=rows.filter(d=>/^(yeelink|yeelight)\.light\./.test(d.model||'')||d.model==='dmaker.fan.p18');
    return [...new Map(bulbs.map(d=>[String(d.did),{id:String(d.did),name:d.name||'Yeelight bulb',model:d.model||'Yeelight',online:Boolean(d.isOnline),firmware:d.extra?.fw_version||'',transport:'cloud',support:[],props:{}}])).values()];
  }
  async rpc(did,method,params){if(!/^\d+$/.test(did))throw new Error('Invalid bulb identifier.');const result=await this.api('/home/rpc/'+did,{id:Math.floor(Math.random()*1e9),method,params});if(result?.error)throw new Error('The bulb rejected this control.');return result;}
}
