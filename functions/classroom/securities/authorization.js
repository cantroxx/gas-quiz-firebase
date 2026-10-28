'use strict';
const C=require('./contracts');
// Production identity/class helpers are injected by the existing application shell.
function createAuthorization({assertLinkedMemberAuth,loadClassroomSettingsForTransaction,assertMemberCanEnterClassroom,isClassroomTeacherMember}){
 return async(tx,memberUserId,uid,classId)=>{
  const [member,classroom]=await Promise.all([assertLinkedMemberAuth(tx,memberUserId,uid),loadClassroomSettingsForTransaction(tx,classId)]);
  if(!classroom.exists)C.fail('permission-denied','이 교실에서 이용할 권한이 없어요.');
  assertMemberCanEnterClassroom(member,classroom.settings);
  return {memberUserId,isTeacher:isClassroomTeacherMember(member,classroom.settings)===true};
 };
}
module.exports={createAuthorization};
