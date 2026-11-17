import {defineSignatureGame} from './define.js';

/**
 * 표현 무대 (만드는 중, ready:false). 이 파일만 고쳐서 완성하세요.
 * 완성하면 ready를 true로 바꾸고, 화면 부품은 src/presentation/components/minigames/signature/modules/sig-stage-show.tsx에 둡니다.
 */
export const stageShow=defineSignatureGame({
 id:'sig-stage-show',ready:false,
 name:'표현 무대',emoji:'🎭',
 oneLine:'장면 카드를 뽑아 모둠이 준비하고 발표해요. 관객이 반응으로 점수를 줘요.',
 rules:['(만드는 중)','(만드는 중)','(만드는 중)'],
 concept:'표현력',
 reflection:'(만드는 중)',nextChallenge:'(만드는 중)',scoringHint:'(만드는 중)',
 seatedNote:'(만드는 중)',
 demo:[{pose:'stand',caption:'(만드는 중)'}],
 timing:{demo:10,tutorial:20,play:120,climax:40,cueSeconds:5},
 cue:()=>({text:'(만드는 중)'}),
 domain:'운동',subCategory:'대표 게임',
 achievement:{code:'연계 확인 필요',title:'(만드는 중)',desc:'(만드는 중)'},
 minutes:5,safetyTips:['(만드는 중)'],
});
