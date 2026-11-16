// 표현 게임을 수업에서 바로 쓸 수 있게 고친 것(2026-11 점검).
// 이름·설명·단계·평가 기준이 서로 맞게, 어려운 낱말은 쉬운 말과 함께, 숨은 도구는 준비물에,
// 음악·신호가 필요한 게임은 앱이 직접 내는 소리(sound)를 쓴다.
export type ExpressionSound=
 |{kind:'beat';bpm:number[]}            // 단계마다 박자 소리
 |{kind:'freeze';bpm:number;holdStep?:number} // 박자가 멈추면 얼음. holdStep 단계는 시작하자마자 5초 멈춘다
 |{kind:'tones';tones:('drop'|'drum'|'wind'|'rain'|'thunder'|'sun')[]}; // 단계마다 다른 소리
export interface StepPatch {title?:string;guide?:string;actionTip?:string;durationSeconds?:number}
export interface ExpressionClarity {
 name?:string;desc?:string;equipment?:string[];
 steps?:Record<number,StepPatch>;rubric?:Record<string,{criterion?:string;desc:string}>;
 dropSafety?:RegExp;sound?:ExpressionSound;
}
export const EXPRESSION_CLARITY:Record<string,ExpressionClarity>={
 music_jumprope:{name:'줄 없는 음악 줄넘기',steps:{3:{guide:'마지막 구간에는 익힌 박자를 편한 발 디딤이나 앉은 팔 동작으로 이어 마무리합니다.'}},
  rubric:{'음악 비트 일치도':{criterion:'박자 맞추기',desc:'발 디딤이나 팔 동작이 박자 소리와 맞았는가?'}},dropSafety:/줄이 닿지/,sound:{kind:'beat',bpm:[100,100,110]}},
 talchum_korea:{desc:'덩더쿵 장단에 맞춰 무릎 굽혔다 펴기(오금질), 팔 뿌리기, 까치걸음으로 우리 탈춤의 신명을 표현해요.',equipment:['손수건 1장 · 1인당(없으면 빈손으로)'],
  steps:{1:{title:'무릎 굽혔다 펴기 (오금질)',guide:'느린 네 박 장단(덩 기덕 쿵 더러러러)에 맞춰 무릎을 굽혔다 펴요. 영상을 쓸 수 있으면 먼저 함께 봐요.',actionTip:'숨을 편하게 쉬며 박자 소리에 맞춰요.'},
   2:{title:'팔 뿌리기 (손수건이나 빈손)',guide:'양팔을 안에서 밖으로 시원하게 뿌려요. 손수건을 쥐면 탈춤의 한삼처럼 보여요.',actionTip:'어깨를 들썩이며 덩실덩실 춤을 춰요. 친구 쪽으로 휘두르지 않아요.'}},
  rubric:{'오금질의 리듬감':{criterion:'무릎 장단 (오금질)',desc:'장단에 맞춰 무릎을 굽혔다 펴는 리듬을 이어 갔는가?'}},sound:{kind:'beat',bpm:[66,72,80]}},
 ganggangsullae:{desc:'느린 원 돌기, 남생아 놀아라, 청어엮기와 풀기로 이어지는 대동 놀이예요. 손은 잡지 않고 간격을 맞춰요.',
  steps:{1:{title:'느리게 (진양조) 원 돌기'},2:{title:'보통 빠르기 (중모리) 남생아 놀아라'},3:{title:'빠르게 (자진모리) 청어엮기와 풀기'}},
  rubric:{'공동체 호흡':{desc:'손을 잡지 않고도 앞뒤 친구와 간격과 속도를 맞추었는가?'}},sound:{kind:'beat',bpm:[60,84,112]}},
 flashmob_creator:{desc:'한 명에서 시작해 두 명, 네 명, 모둠 전체가 차례로 합류하는 깜짝 단체 춤을 만들어요. 처음이면 두 차시로 나눠 해요.',
  steps:{1:{durationSeconds:30},2:{durationSeconds:40},3:{durationSeconds:60,guide:'박자 소리 여덟 번마다 두 명씩 합류해, 마지막에 모둠 전원이 함께 춰요.'}},sound:{kind:'beat',bpm:[96,100,104]}},
 element_forces:{name:'자연의 힘 소환사',desc:'불(강하고 곧게), 물(부드럽게 굽이치며), 흙(무겁고 단단하게)의 느낌을 몸으로 구별해 표현해요.',
  rubric:{'움직임 질감(Texture) 구분':{criterion:'움직임 느낌 구분',desc:'불의 날카로움, 물의 부드러움, 흙의 무게감이 구별되는가?'}}},
 body_sculpture:{desc:'모둠원이 한 명씩 차례로 자세를 더해, 서로 닿지 않고도 이어진 하나의 조각상을 만들어요.',steps:{3:{actionTip:'숨은 편하게 쉬면서 5초 동안 함께 멈춰요.'}}},
 rhythm_clapping:{steps:{2:{title:'가슴·허벅지 콤보',guide:'오른가슴-왼가슴-오른허벅지-왼허벅지-손뼉 두 번으로 이어 쳐요.'}},sound:{kind:'beat',bpm:[90,96,100]}},
 story_drama_relay:{desc:'기-승-전-결 네 장면을 모둠원이 하나씩 맡아 말없이 몸으로 이어 보여 줘요. 시작 전에 1분 동안 이야기를 정해요.',
  steps:{1:{durationSeconds:30,guide:'시작 전에 모둠이 1분 동안 이야기를 정해요. 첫 주자는 소풍을 가거나 도시락을 먹는 행복한 몸짓을 해요.'},2:{durationSeconds:30},3:{durationSeconds:30},4:{durationSeconds:30}}},
 art_gallery_critic:{desc:'앞서 만든 표현을 한 모둠씩 보여 주고, 다른 모둠은 큐레이터처럼 감상해 구체적으로 칭찬해요. 표현 활동을 한 뒤에 이어서 써요.',
  steps:{3:{guide:'화면의 두 기준(감상의 태도, 구체적인 칭찬)으로 별점을 정하고 박수를 보내요.'}}},
 world_folk_dance:{steps:{1:{durationSeconds:40},2:{durationSeconds:40},3:{durationSeconds:40,title:'체코 폴카: 뒤꿈치-발끝 디딤',guide:'발뒤꿈치-발끝을 번갈아 찍고 세 박자로 자기 자리에서 디뎌요. 뛰지 않아도 돼요.'}},
  rubric:{'스텝의 정확성':{criterion:'발 디딤 순서',desc:'나라마다 정한 발 디딤 순서(앞으로 4걸음·뒤로 4걸음, 뒤꿈치-발끝)를 지켰는가?'}},sound:{kind:'beat',bpm:[88,104,112]}},
 musical_scene_maker:{desc:'박자 소리에 맞춰 바쁜 군중, 주인공의 독무, 모두의 피날레 세 장면을 모둠이 연출해요.',sound:{kind:'beat',bpm:[112,72,100]}},
 cheerleading_team:{steps:{1:{title:'기본 팔 모션 (하이 V → T → 로우 V)',guide:'두 팔을 위로 V자(하이 V) → 양옆으로 T자 → 아래로 V자(로우 V)로 박자에 맞춰 끊어 움직여요.',actionTip:'팔꿈치를 펴고 주먹은 단단히 쥐어요.'}},sound:{kind:'beat',bpm:[100,100,100]}},
 taebo_fitness:{desc:'박자에 맞춰 허공에 잽·스트레이트·어퍼컷과 발끝 짚기를 이어 하는 에어로빅이에요. 사람을 향해 치지 않아요.',
  steps:{2:{guide:'상체를 U자로 숙였다 일어나며(위빙) 아래에서 위로 허공을 올려 치는 어퍼컷을 이어요.'}},sound:{kind:'beat',bpm:[108,108,108]}},
 sound_painter:{steps:{3:{guide:'높고 신비로운 소리에 맞춰 두 팔을 양옆으로 펼쳐 제자리에서 공기를 감싸듯 움직여요.',actionTip:'소리의 결을 들으며 팔을 천천히 움직여요.'}},sound:{kind:'tones',tones:['drop','drum','wind']}},
 musical_freeze:{steps:{1:{guide:'박자 소리가 나는 동안 해적선을 청소하거나 망원경을 보는 익살스러운 연기를 펼쳐요. 소리가 멈추면 그대로 얼음!'},2:{guide:'호루라기 소리와 함께 거대한 파도를 보고 놀란 표정으로 5초간 얼음!'},3:{guide:'다시 박자 소리가 나면 보물 상자를 열고 환호하는 춤을 춘 뒤 마지막 자세를 취해요.'}},sound:{kind:'freeze',bpm:104,holdStep:1}},
 kpop_easy_challenge:{desc:'가이드 영상을 보며 4박자 반복 포인트 안무를 따라 해요. 학교망에서 영상이 막히면 글 안내와 박자 소리로 해요.',
  steps:{1:{actionTip:'영상이 좌우 반전(거울 모드)이면 화면 속 사람과 같은 쪽 손을 써요.'},2:{guide:'양손으로 가슴 앞 하트를 만들고 손가락을 튕기며 시선은 앞을 봐요.'}},sound:{kind:'beat',bpm:[100,100,100]}},
 space_traveler:{steps:{1:{title:'우주복 입고 우주로 나가기'},2:{title:'여러 높이로 떠다니기'}}},
 shadow_puppeteer:{steps:{1:{title:'인형사: 내가 만드는 동작'},2:{title:'그림자: 똑같이 따라 하기'}}},
 weather_dance:{sound:{kind:'tones',tones:['rain','wind','thunder','sun']}},
 magic_scarf:{equipment:['스카프 1장 · 1인당(없으면 손수건)']},
 ribbon_gymnast:{equipment:['리본이나 긴 끈 1개 · 1인당(없으면 스카프)']},
};
