/** 기기를 몸에 지니거나 손에 들고 움직임 센서로 하는 놀이. 큰 화면(태블릿)이어도 '손에 쥐어요' 안내가 맞다. */
export const MOTION_SENSOR_GAMES:readonly string[]=['jump', 'squat', 'run', 'target', 'tilt_balance', 'tilt_race', 'shake', 'arm_raise', 'wave', 'one_leg', 'freeze', 'plank', 'punch', 'foot-center-balance', 'body_twist', 'head-shoulders-knees', 'kayak-paddle', 'badminton-smash-rhythm', 'seesaw-balance-tap'];
/** 3초 준비 카운트다운의 기기 안내: 센서 놀이인지가 먼저고, 그다음에 화면 크기를 본다. */
export function countdownDeviceHint(gameType:string,wide:boolean){
  if(MOTION_SENSOR_GAMES.includes(gameType))return '기기를 거치하거나 손에 꼭 쥐어요.';
  return wide?'화면을 모두가 볼 수 있게 두어요.':'기기를 잘 보이는 곳에 두어요.';
}
