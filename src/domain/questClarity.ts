// 신체 미션의 이름·설명·준비물을 수업에서 바로 쓸 수 있게 고친 것(2026-11 점검).
// 준비물에는 수량과 '모둠당/1인당'을, 이름에는 실제로 하는 일을 쓴다. 1인용 미션은 모둠이 한 세트를 차례로 쓴다.
export interface QuestClarity {name?:string;description?:string;equipment?:string[]}
export const QUEST_CLARITY:Record<string,QuestClarity>={
 zigzag:{description:'막힌 칸을 피해 길을 고르고, 바닥 번호 표식을 따라 걸어 콩주머니를 가져와요. 모둠이 한 판을 차례로 써요.',equipment:['번호 표식 1~9(3줄 × 3칸) · 모둠당 한 판','콩주머니 1개 · 모둠당']},
 'dribble-rhythm':{equipment:['부드러운 공 1개 · 1인당']},
 'pass-gate-rescue':{description:'공을 굴려 보내고, 보낸 사람은 빈 표식으로 걸어가요. 모두가 보내고 받으면 성공이에요.',equipment:['부드러운 공 1개 · 모둠당','표식 · 인원보다 1개 많게(4명이면 5개)']},
 squat:{equipment:['가벼운 물건 1개(콩주머니)','높이가 다른 자리 3곳: 바닥 · 의자 위 · 벽 테이프(어깨 높이)']},
 plank:{name:'벽 짚고 버티기'},
 one_leg:{equipment:['짚을 수 있는 벽이나 의자','개인 공간']},
 fitness:{equipment:['개인 공간']},
 memory:{equipment:['● ▲ ■ ◆ 표식 4개(없으면 색 콘 4개) · 모둠당']},
 stopwatch:{description:'시계를 보지 않고 걸으며 목표 시간을 느껴 보고 내 예상과 비교해요. 기기 버튼은 짝이 눌러 줘요.'},
 'relay-mission-runner':{name:'역할 바꾸는 보급 릴레이',equipment:['가벼운 물건 1개(콩주머니) · 모둠당','출발·반환 표식 2개 · 통로마다','서로 떨어진 통로 · 모둠 인원만큼']},
 'space-occupier':{equipment:['번호 표식 1~6 · 모둠당','서로 겹치지 않는 걷는 길']},
 target:{description:'거리와 힘을 골라 콩주머니를 던지거나 굴려 표적에 보내고, 다음 시도에서 조절해요.',equipment:['콩주머니 3개(없으면 부드러운 공) · 1인당','바닥 표적 3개(가까움·중간·멀리) · 모둠당']},
 'base-running-decide':{description:'선생님이 든 공의 위치를 보고 갈지 멈출지 정한 뒤, 베이스 사이를 걸어서 실행해요.',equipment:['출발·다음 베이스 표식 2개','선생님이 수비 역할로 들 공 1개']},
 'posture-guardian':{name:'생활 자세 배달 연습',equipment:['안정된 의자','가벼운 물건 1개','탁자','출발·도착 표식 2개']},
};
