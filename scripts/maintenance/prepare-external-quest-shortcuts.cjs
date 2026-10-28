'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const auth=JSON.parse(fs.readFileSync('/Users/kdw/Library/Application Support/com.vercel.cli/auth.json','utf8'));
const team='team_mjs8N1PNeLKCdZJMS11isUSA';
async function api(p){const r=await fetch('https://api.vercel.com'+p+(p.includes('?')?'&':'?')+'teamId='+team,{headers:{Authorization:'Bearer '+auth.token}});if(!r.ok)throw Error('Vercel HTTP '+r.status);return r.json();}
(async()=>{const name=process.argv[2];assert(['dj48-fraction-world','kbo-owner'].includes(name));const p=await api('/v9/projects/'+name),deployment=p.targets.production.id,tree=await api('/v6/deployments/'+deployment+'/files');
const files=[];function walk(rows,dir=''){for(const f of rows){const name=dir+f.name;if(f.children)walk(f.children,name+'/');else files.push({...f,path:name.replace(/^src\//,'')});}}walk(tree);
const root='/tmp/growth-external-'+name;fs.mkdirSync(root,{recursive:true});
let next=0;await Promise.all(Array.from({length:6},async()=>{while(next<files.length){const f=files[next++];assert(!f.path.split('/').includes('..'));const out=path.join(root,f.path);const response=await api('/v8/deployments/'+deployment+'/files/'+f.uid);const data=Buffer.from(response.data,'base64');assert.equal(crypto.createHash('sha1').update(data).digest('hex'),f.uid,'Source hash '+f.path);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);}}));
const entry=name==='dj48-fraction-world'?'public/fraction-world/index.html':'.vercel/output/static/index.html';assert(fs.existsSync(path.join(root,entry)),'Entry required');const old=fs.readFileSync(path.join(root,entry),'utf8');const tag='<script defer src="https://dj48-quiztown-firebase.web.app/js/player-status-shortcut.js?v=quests-20260920"></script>';
let html=old.includes('player-status-shortcut.js')?old.replace(/<script[^>]*src="[^"<>]*player-status-shortcut\.js[^"<>]*"[^>]*><\/script>/g,tag):old.replace('</head>',tag+'\n</head>');if(name==='kbo-owner'){
 const built='/tmp/growth-kbo-source-build/dist';
 for(const file of files.filter(f=>f.path.startsWith('.vercel/output/static/')&&!f.path.endsWith('/index.html'))){const rel=file.path.slice('.vercel/output/static/'.length);assert.deepEqual(fs.readFileSync(path.join(built,rel)),fs.readFileSync(path.join(root,file.path)),'Built asset differs: '+rel);}
 html=fs.readFileSync(path.join(built,'index.html'),'utf8');
 const strip=s=>s.replace(/<script[^>]*src="[^"<>]*player-status-shortcut\.js[^"<>]*"[^>]*><\/script>/g,'').replace(/\s+/g,' ').trim();assert.equal(strip(html),strip(old),'Only shortcut may change');
 }
 assert.notEqual(html,old);fs.writeFileSync(path.join(root,entry),html);
fs.mkdirSync(path.join(root,'.vercel'),{recursive:true});fs.writeFileSync(path.join(root,'.vercel/project.json'),JSON.stringify({projectId:p.id,orgId:p.accountId,projectName:p.name}));
fs.writeFileSync(root+'-plan.json',JSON.stringify({project:name,source:deployment,files:files.map(f=>({path:f.path,hash:f.uid})),changed:[entry]},null,2));console.log(JSON.stringify({root,source:deployment,fileCount:files.length,changed:entry,outputDirectory:p.outputDirectory}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
