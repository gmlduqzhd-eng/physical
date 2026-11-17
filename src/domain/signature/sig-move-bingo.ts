import {defineSignatureGame} from './define.js';

/**
 * 몸 빙고 (만드는 중, ready:false). 이 파일만 고쳐서 완성하세요.
 * 완성하면 ready를 true로 바꾸고, 화면 부품은 src/presentation/components/minigames/signature/modules/sig-move-bingo.tsx에 둡니다.
 */
export const moveBingo=defineSignatureGame({
 id:'sig-move-bingo',ready:false,
 name:'몸 빙고',emoji:'🎯',
 oneLine:'3×3 동작판에서 팀이 차례로 칸을 골라 동작을 해내면 그 칸을 차지해요. 한 줄이면 빙고!',
 rules:['(만드는 중)','(만드는 중)','(만드는 중)'],
 concept:'민첩성',
 reflection:'(만드는 중)',nextChallenge:'(만드는 중)',scoringHint:'(만드는 중)',
 seatedNote:'(만드는 중)',
 demo:[{pose:'stand',caption:'(만드는 중)'}],
 timing:{demo:10,tutorial:20,play:120,climax:40,cueSeconds:5},
 cue:()=>({text:'(만드는 중)'}),
 domain:'운동',subCategory:'대표 게임',
 achievement:{code:'연계 확인 필요',title:'(만드는 중)',desc:'(만드는 중)'},
 minutes:5,safetyTips:['(만드는 중)'],
});
