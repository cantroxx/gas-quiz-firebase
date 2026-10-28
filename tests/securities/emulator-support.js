'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createAuthorization}=require('../../functions/classroom/securities/authorization');
const C=require('../../functions/classroom/securities/contracts');
function guard(){
 const host=process.env.FIRESTORE_EMULATOR_HOST,projectId=process.env.GCLOUD_PROJECT||'demo-dj48-securities';
 if(!host||!/^127\.0\.0\.1:\d+$/.test(host)||!projectId.startsWith('demo-'))throw Error('Refusing securities writes outside local demo Emulator');
 return {host,projectId};
}
function helpersFor(db){
 // Execute the repository's current membership/class permission helpers, not a mocked allow-all authorizer.
 const source=fs.readFileSync(path.resolve(__dirname,'../../functions/index.js'),'utf8');
 const names=['assertActiveMember','assertLinkedMemberAuth','loadClassroomSettingsForTransaction','assertMemberCanEnterClassroom','isClassroomTeacherMember'];
 const scope={db,HttpsError:C.SecuritiesError,SUPER_ADMIN_MEMBER_USER_ID:'synthetic-superadmin',normalizeClassroomSettings:(id,data)=>({classId:id,...data})};vm.createContext(scope);
 for(const name of names){const index=source.indexOf(`function ${name}(`);if(index<0)throw Error(`Missing permission helper ${name}`);const start=source.lastIndexOf('\n',index)+1,end=source.indexOf('\n}',index)+2;vm.runInContext(source.slice(start,end),scope);}
 return Object.fromEntries(names.filter(n=>n!=='assertActiveMember').map(n=>[n,scope[n]]));
}
async function seedMembers(db,classId='SECURITIES-TEST'){
 const people={student:'sec-a',other:'sec-b',outsider:'sec-out',teacher:'sec-teacher',wrongTeacher:'sec-wrong',inactive:'sec-inactive'};
 await db.doc(`classrooms/${classId}`).set({grade:'4',classNumber:'8'});
 for(const [role,id]of Object.entries(people))await db.doc(`users/${id}`).set({userId:id,authUid:`uid-${id}`,role:role.includes('Teacher')||role==='teacher'?'admin':'student',adminLevel:'classAdmin',grade:'4',classNumber:['outsider','wrongTeacher'].includes(role)?'9':'8',active:role!=='inactive',status:role==='inactive'?'inactive':'active',nickname:`합성 ${role}`});
 return people;
}
const authorizeFor=db=>createAuthorization(helpersFor(db));
module.exports={guard,helpersFor,authorizeFor,seedMembers};
