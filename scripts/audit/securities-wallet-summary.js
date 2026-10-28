#!/usr/bin/env node
'use strict';
// Read only. Persist aggregate amounts only; no student IDs, names or raw wallets.
const fs=require('node:fs'),lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
(async()=>{
 const project='dj48-quiztown-firebase';await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true}),base=`projects/${project}/databases/(default)/documents`;
 const rows=(await api.post(base+':runQuery',{structuredQuery:{from:[{collectionId:'users'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'grade'},op:'EQUAL',value:{stringValue:'4'}}},{fieldFilter:{field:{fieldPath:'classNumber'},op:'EQUAL',value:{stringValue:'8'}}}]}},select:{fields:[{fieldPath:'role'},{fieldPath:'active'},{fieldPath:'status'}]},limit:100}})).body;
 const members=rows.filter(r=>r.document&&r.document.fields?.role?.stringValue==='student'&&r.document.fields?.active?.booleanValue!==false&&!['inactive','withdrawn','deleted'].includes(r.document.fields?.status?.stringValue));if(!members.length||members.length>=100)throw Error('Unexpected pilot membership count');
 const wallets=(await api.post(base+':batchGet',{documents:members.map(r=>base+'/userEconomy/'+r.document.name.split('/').pop()),mask:{fieldPaths:['djCoin','coin']}})).body;
 const values=wallets.map(r=>{const f=r.found?.fields||{},v=f.djCoin??f.coin;return Number(v?.integerValue??v?.doubleValue??0);}).sort((a,b)=>a-b);if(values.some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Wallet needs explicit review: invalid integer balance');
 const report={classId:'G4-C8',readOnly:true,studentCount:values.length,totalCoin:values.reduce((a,b)=>a+b,0),medianCoin:values[Math.floor(values.length/2)],minCoin:values[0],maxCoin:values.at(-1),below100:values.filter(v=>v<100).length,queriedAt:new Date().toISOString()};fs.writeFileSync('/tmp/securities-cd-20261018/wallet-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1});
