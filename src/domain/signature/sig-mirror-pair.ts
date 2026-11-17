import {defineSignatureGame} from './define.js';

/**
 * 거울 짝꿍 (만드는 중, ready:false). 이 파일만 고쳐서 완성하세요.
 * 완성하면 ready를 true로 바꾸고, 화면 부품은 src/presentation/components/minigames/signature/modules/sig-mirror-pair.tsx에 둡니다.
 */
export const mirrorPair=defineSignatureGame({
 id:'sig-mirror-pair',ready:false,
 name:'거울 짝꿍',emoji:'🪞',
 oneLine:'짝이 거울처럼 따라 하다가 ‘하나 바꾸기!’가 나오면 바뀐 곳을 찾아요.',
 rules:['(만드는 중)','(만드는 중)','(만드는 중)'],
 concept:'관찰과 협응',
 reflection:'(만드는 중)',nextChallenge:'(만드는 중)',scoringHint:'(만드는 중)',
 seatedNote:'(만드는 중)',
 demo:[{pose:'stand',caption:'(만드는 중)'}],
 timing:{demo:10,tutorial:20,play:120,climax:40,cueSeconds:5},
 cue:()=>({text:'(만드는 중)'}),
 domain:'운동',subCategory:'대표 게임',
 achievement:{code:'연계 확인 필요',title:'(만드는 중)',desc:'(만드는 중)'},
 minutes:5,safetyTips:['(만드는 중)'],
});
