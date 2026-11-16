/** 성취기준 번호가 아직 정해지지 않은 활동의 자리표시 값. */
export const PENDING_CURRICULUM_CODE='연계 확인 필요';
/** 화면에 보일 성취기준 이름표. 번호가 아직 없으면 '연계 확인 필요' 대신 '학습 목표'로 보여 준다. */
export const achievementLabel=(code:string)=>code===PENDING_CURRICULUM_CODE?'학습 목표':code;
