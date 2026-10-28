'use strict';
const {FieldValue}=require('firebase-admin/firestore');
// Caller owns the once-only, server-validated match/run settlement gate.
function award(tx,db,memberId,game,kind){
 if(!memberId||!['stars','hearts'].includes(kind))return;
 tx.set(db.collection('users').doc(memberId),{gameHonors:{[kind]:FieldValue.increment(1),games:{[game]:FieldValue.increment(1)}}},{merge:true});
}
module.exports={award};
