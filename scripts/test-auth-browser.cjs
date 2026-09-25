const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
process.env.NODE_ENV='test';
process.env.DB_NAME=process.env.DB_NAME || 'pdh_auth1_test_20260925';
if(!process.env.DB_NAME.startsWith('pdh_auth1_test_')) throw new Error('Dedicated test database required');
process.env.CORS_ORIGIN='http://localhost:5189';
const express=require('../server/node_modules/express');
const {pool}=require('../server/dist/db/connection');
const app=express();
app.use((req,res,next)=>req.path.startsWith('/api/')?require('../server/dist/index').default(req,res,next):next());
app.use(express.static(path.resolve(__dirname,'../client/dist')));
app.get('*',(_req,res)=>res.sendFile(path.resolve(__dirname,'../client/dist/index.html')));
let server, chrome, socket;
const pending=new Map(); let nextId=0;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function command(method,params={}) {const id=++nextId;const p=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));socket.send(JSON.stringify({id,method,params}));return p;}
async function evaluate(expression) {const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression) {for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Timed out: '+expression);}
(async()=>{
 await pool.query('DELETE FROM auth_rate_limits');
 server=app.listen(5189,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
 const profile=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'pdh-auth-browser-'));
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9229','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let pages;
 for(let i=0;i<100;i++){try{pages=await (await fetch('http://127.0.0.1:9229/json')).json();break;}catch{await delay(100);}}
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}});
 await command('Page.enable'); await command('Page.navigate',{url:'http://localhost:5189/login'});
 await until("!!document.querySelector('input[name=username]')");
 for(const [width,height] of [[360,800],[390,844],[412,915],[768,1024],[1024,768],[1366,768],[1920,1080]]) {
   await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
   assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,`Login overflow ${width}`);
 }
 console.log('PASS login responsive: 7 requested viewport sizes');
 await evaluate("document.querySelector('[name=username]').value='admin';document.querySelector('[name=password]').value='admin1234';document.querySelector('form').requestSubmit()");
 await until("document.body.innerText.includes('SUPER_ADMIN')");
 await evaluate("history.pushState(null,'','/missions')");
 assert.equal(await evaluate("localStorage.getItem('token')"),null);
 assert.equal(await evaluate("document.cookie.includes('pdh_session')"),false);
 await evaluate("[...document.querySelectorAll('section button')][0].click()");await until("!!document.querySelector('.swal2-confirm')");
 assert.equal(await evaluate("document.querySelector('.swal2-cancel').offsetWidth>0"),true);
 await evaluate("document.querySelector('.swal2-confirm').click()"); await until("!!document.querySelector('[name=username]')");
 assert.equal(await evaluate("fetch('/api/auth/me').then(r=>r.status)"),401);
 await evaluate('setTimeout(()=>history.back(),0)'); await delay(500);
 assert.equal(await evaluate("!!document.querySelector('[name=username]')"),true);
 await evaluate("document.querySelector('[name=username]').value='driver1';document.querySelector('[name=password]').value='ems1234';document.querySelector('form').requestSubmit()");
 await until("document.body.innerText.includes('DRIVER') && !document.querySelector('[name=username]')");
 assert.equal(await evaluate("document.body.innerText.includes('SUPER_ADMIN')"),false);
 assert.equal(await evaluate("[...document.querySelectorAll('nav button')].filter(b=>getComputedStyle(b).display!=='none').every(b=>b.innerText.includes('Driver') || b.innerText.includes('พลขับ'))"),true);
 console.log('PASS browser: admin login, HttpOnly, logout confirmation, revoked API, back button, driver isolation and navigation');
 const out=path.resolve(__dirname,'../docs/audit/auth1-browser.png');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out,Buffer.from(shot.data,'base64'));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{socket?.close();chrome?.kill();server?.close();await pool.end();});
