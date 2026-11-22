// 첫 화면이 쓰는 '원리 체험' 두 가지. zod(playRecipes)를 끌고 오지 않게 따로 둔다.
import {FLAGSHIPS} from './flagship.js';

export const PRIMARY_EXPERIENCES=([
 {id:'map',game:'expedition-map',name:'힌트를 모아 길 열기',title:'움직이는 비밀지도',description:'모둠마다 다른 힌트를 모아야 문이 열려요.'},
 {id:'loop',game:'expedition-loop',name:'우리 박자를 반 전체 합주로',title:'바디루프 발전소',description:'손뼉·발 디딤을 맞추고 모둠의 입력 박자를 함께 들어요.'},
] as const).map(item=>{
 // 준비물과 시간은 대표 원정 소개(/expeditions)와 같은 값을 쓴다. 페이지마다 다르게 적히지 않게 한다.
 const flagship=FLAGSHIPS.find(f=>f.id===item.game)!;
 return {...item,equipment:flagship.device,minutes:flagship.minutes};
});
export type ExperienceId=typeof PRIMARY_EXPERIENCES[number]['id'];
export const experienceById=(id:string|undefined)=>PRIMARY_EXPERIENCES.find(g=>g.id===id);
export const experienceForGame=(game:string)=>PRIMARY_EXPERIENCES.find(g=>g.game===game);
