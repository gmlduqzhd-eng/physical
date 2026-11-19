import {isAvailableGame} from './gameLifecycle';
import {isQuestId} from './movementQuests';

/**
 * 기기를 몸에 지니거나 손에 들고 움직임 센서로 하는 놀이의 종류(예전 센서 놀이 포함).
 * 이 가운데 지금 열 수 있고(합쳐지거나 빠지지 않은) 3초 카운트다운을 쓰는(움직임 미션이 아닌) 활동만 아래 목록에 남는다.
 * 합쳐진 놀이는 새 주소로 옮겨 가고, 움직임 미션은 자기 시작 화면을 써서 카운트다운이 뜨지 않는다.
 */
const SENSOR_GAME_TYPES:readonly string[]=['jump','squat','run','target','tilt_balance','tilt_race','shake','arm_raise','wave','one_leg','freeze','plank','punch','foot-center-balance','body_twist','head-shoulders-knees','kayak-paddle','badminton-smash-rhythm','seesaw-balance-tap'];
/** 지금 카운트다운과 '센서 허용하기' 안내를 보여 주는 센서 놀이. 큰 화면(태블릿)이어도 '손에 쥐어요' 안내가 맞다. */
export const MOTION_SENSOR_GAMES:readonly string[]=SENSOR_GAME_TYPES.filter(id=>isAvailableGame(id)&&!isQuestId(id));
/** 3초 준비 카운트다운의 기기 안내: 센서 놀이인지가 먼저고, 그다음에 화면 크기를 본다. */
export function countdownDeviceHint(gameType:string,wide:boolean){
  if(MOTION_SENSOR_GAMES.includes(gameType))return '기기를 거치하거나 손에 꼭 쥐어요.';
  return wide?'화면을 모두가 볼 수 있게 두어요.':'기기를 잘 보이는 곳에 두어요.';
}
