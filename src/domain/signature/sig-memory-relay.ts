import {defineSignatureGame} from './define.js';

/**
 * 기억 릴레이 (만드는 중, ready:false). 이 파일만 고쳐서 완성하세요.
 * 완성하면 ready를 true로 바꾸고, 화면 부품은 src/presentation/components/minigames/signature/modules/sig-memory-relay.tsx에 둡니다.
 */
export const memoryRelay=defineSignatureGame({
 id:'sig-memory-relay',ready:false,
 name:'기억 릴레이',emoji:'🧠',
 oneLine:'화면 순서를 외워 모둠이 이어서 해요. 성공할 때마다 하나씩 늘어나요.',
 rules:['(만드는 중)','(만드는 중)','(만드는 중)'],
 concept:'순서 기억',
 reflection:'(만드는 중)',nextChallenge:'(만드는 중)',scoringHint:'(만드는 중)',
 seatedNote:'(만드는 중)',
 demo:[{pose:'stand',caption:'(만드는 중)'}],
 timing:{demo:10,tutorial:20,play:120,climax:40,cueSeconds:5},
 cue:()=>({text:'(만드는 중)'}),
 domain:'운동',subCategory:'대표 게임',
 achievement:{code:'연계 확인 필요',title:'(만드는 중)',desc:'(만드는 중)'},
 minutes:5,safetyTips:['(만드는 중)'],
});
