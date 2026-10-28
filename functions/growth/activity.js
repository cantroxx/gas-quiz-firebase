'use strict';
const crypto=require('node:crypto');
// Called only after the game server accepts an action. Collection is server-owned.
function record(tx,db,{source,memberId,uid,counts,time=Date.now()}) {
 const id=crypto.createHash('sha256').update(source).digest('hex');
 tx.set(db.collection('growthActivities').doc(id),{source,memberId:memberId||null,uid:uid||null,counts,time});
}
module.exports={record};
