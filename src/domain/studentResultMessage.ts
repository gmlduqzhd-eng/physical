/**
 * 학생 폰 결과 화면의 짧은 안내. 1~2학년이 바로 알아듣게 한 문장으로 쓴다.
 * 자세한 처리 설명(서버 접수·교사 승인)은 '선생님용 설명'에 classroomResultMessage로 따로 둔다.
 */
export function studentResultMessage({quiet,partial,queue,online,warning,score}:{quiet:boolean;partial:boolean;queue:number;online:boolean;warning:string;score:number}){
  if(quiet)return '쉬면서 지켜본 것도 기록했어요.';
  if(warning)return warning;
  if(queue>0)return online?'선생님께 보내고 있어요…':'인터넷이 돌아오면 선생님께 보낼게요. 화면을 열어 두세요.';
  if(partial)return '해 본 만큼 기록했어요.';
  return score>0?'잘했어요! 선생님께 보냈어요.':'참여한 것을 기록했어요.';
}
