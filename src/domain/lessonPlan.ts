import { LESSON_GAME_CATALOG, type LessonGameMeta } from '../data/lessonGameCatalog';
import { findStandards, LOW_GRADE_THEMES, CORE_COMPETENCIES, type CurriculumStandard } from '../data/curriculumStandards';

// ─── 타입 ───
export type GradeGroup = '1~2학년 · 즐거운 생활 연계' | '3~4학년군' | '5~6학년군';
export type DomainOption = '자동' | '운동' | '스포츠' | '표현' | '놀이' | '기본 움직임';
export type ActivityMode = '자동 추천' | '개인' | '짝' | '모둠' | '팀 대항' | '학급 전체';
export type DeviceOption = '없음' | '교사용 1대' | '모둠별 1대' | '학생 1인 1기기';
export type SpaceOption = '자동' | '교실' | '체육관' | '운동장' | '다목적실' | '좁은 실내 공간';
export type GameSelectMode = 'auto' | 'manual';
export type FocusArea = '신체활동량' | '움직임 기능' | '체력' | '전략적 사고' | '협력' | '의사소통' | '창의적 표현' | '건강 관리' | '안전' | '즐거움';

export function validateLessonInputs(duration: unknown, students: unknown, groupSize: unknown): string | null {
  const integer = (value: unknown, min: number, max: number) =>
    (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') &&
    Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
  if (!integer(duration, 6, 480)) return '수업 시간을 6~480분 사이의 정수로 입력해 주세요.';
  if (!integer(students, 1, 200)) return '학생 수를 1~200명 사이의 정수로 입력해 주세요.';
  if (!integer(groupSize, 2, 20)) return '모둠별 최대 인원을 2~20명 사이의 정수로 입력해 주세요.';
  return null;
}

export function lessonGroupSizes(students: number, maximum: number): number[] {
  const error = validateLessonInputs(40, students, maximum);
  if (error) throw new Error(error);
  const groups = Math.ceil(students / maximum);
  return Array.from({ length: groups }, (_, index) => Math.floor(students / groups) + (index < students % groups ? 1 : 0));
}

function groupSummary(sizes: number[]): string {
  const counts = new Map<number, number>();
  sizes.forEach(size => counts.set(size, (counts.get(size) ?? 0) + 1));
  return [...counts].map(([size, count]) => `${size}명씩 ${count}모둠`).join(' · ');
}

export interface GeneratedPlan {
  overview: { gradeGroup: string; duration: number; unit: string; topic: string; domain: string; activityMode: string; studentCount: number; space: string; };
  curriculum: { domain: string; standards: CurriculumStandard[]; competencies: string[]; knowledge: string; process: string; attitude: string; isLowGrade: boolean; lowGradeTheme?: string; };
  learningGoals: { goals: string[]; successCriteria: string[]; };
  recommendedGame: { game: LessonGameMeta; reason: string; role: string; usageTime: number; score: number; } | null;
  lessonFlow: { stage: string; time: number; activity: string; teacherActivity: string; studentActivity: string; gameUsage: string; materials: string; safety: string; evaluation: string; }[];
  gameDetail: { preparation: string; arrangement: string; procedure: string[]; rotation: string; variation: string[]; difficulty: string; deviceOps: string; } | null;
  safety: string[];
  evaluation: { elements: string[]; methods: string[]; checklist: string[]; };
  selfEval: { items: string[]; };
  levelAdjust: { needHelp: string[]; general: string[]; challenge: string[]; };
  inclusion: string[];
  teacherTips: { problem: string; solution: string; }[];
  alternatives: { scenario: string; solution: string; }[];
  gameVariations: { level: string; description: string; }[];
  noDeviceActivity: string;
}

// ─── 게임 적합도 계산 ───
export function calcGameScore(game: LessonGameMeta, grade: GradeGroup, domain: DomainOption, actMode: ActivityMode, space: SpaceOption, device: DeviceOption, focuses: FocusArea[]): number {
  let score = 0;
  const gradeKey = grade === '1~2학년 · 즐거운 생활 연계' ? '1~2학년' : grade;

  // 교육과정 적합성 (35)
  if (domain !== '자동' && domain !== '놀이' && domain !== '기본 움직임') {
    if (game.domain === domain) score += 35;
    else score += 5;
  } else { score += 20; }

  // 학년 적합성 (20)
  if (game.grades.includes(gradeKey)) score += 20;
  else score += 3;

  // 활동 형태 적합성 (15)
  if (actMode === '자동 추천') { score += 10; }
  else if (game.activityModes.includes(actMode as any)) { score += 15; }
  else { score += 3; }

  // 공간 적합성 (10)
  if (space === '자동') { score += 7; }
  else if (game.space.includes(space as any)) { score += 10; }
  else { score += 2; }

  // 기기 적합성 (10)
  if (device === '없음') { score += 5; }
  else if (game.deviceMode.includes(device as any)) { score += 10; }
  else { score += 3; }

  // 안전 및 운영성 + 중점 보너스 (10)
  let focusBonus = 0;
  focuses.forEach(f => {
    if (f === '신체활동량' && game.intensity !== '낮음') focusBonus += 2;
    if (f === '전략적 사고' && game.domain === '스포츠' && game.sportType === '전략형') focusBonus += 2;
    if (f === '협력' && game.activityModes.some(m => ['모둠','팀 대항','학급 전체'].includes(m))) focusBonus += 2;
    if (f === '창의적 표현' && game.domain === '표현') focusBonus += 2;
    if (f === '체력' && game.domain === '운동') focusBonus += 2;
    if (f === '움직임 기능' && game.intensity !== '낮음') focusBonus += 1;
    if (f === '즐거움') focusBonus += 1;
  });
  score += Math.min(10, focusBonus);

  return Math.min(100, score);
}

// ─── 수업 지도안 생성 엔진 ───
export function generateLessonPlan(
  grade: GradeGroup, duration: number, domain: DomainOption, unit: string,
  actMode: ActivityMode, studentCount: number, space: SpaceOption, device: DeviceOption,
  focuses: FocusArea[], selectedGame: LessonGameMeta | null, gameMode: GameSelectMode, groupSize = 4
): GeneratedPlan {
  const inputError = validateLessonInputs(duration, studentCount, groupSize);
  if (inputError) throw new Error(inputError);
  const isLowGrade = grade === '1~2학년 · 즐거운 생활 연계';
  const gradeKey = isLowGrade ? '1~2학년' : grade;
  const effectiveDomain = domain === '자동' || domain === '놀이' || domain === '기본 움직임' ? '운동' : domain;

  // Step 1: 교육과정 연계
  let standards: CurriculumStandard[] = [];
  let lowGradeTheme = '';
  if (!isLowGrade) {
    standards = findStandards(grade as '3~4학년군' | '5~6학년군', effectiveDomain as any);
    if (standards.length > 2) standards = standards.slice(0, 2);
  } else {
    const themes = LOW_GRADE_THEMES;
    if (domain === '표현' || domain === '기본 움직임') lowGradeTheme = themes.find(t => t.theme.includes('표현'))?.theme || themes[0].theme;
    else if (domain === '놀이') lowGradeTheme = themes[0].theme;
    else lowGradeTheme = themes.find(t => t.keywords.some(k => unit.includes(k)))?.theme || themes[0].theme;
  }

  // Step 2: 게임 추천
  let recommendedGame: GeneratedPlan['recommendedGame'] = null;
  if (selectedGame) {
    const sc = calcGameScore(selectedGame, grade, domain, actMode, space, device, focuses);
    recommendedGame = { game: selectedGame, reason: generateGameReason(selectedGame, effectiveDomain, gradeKey), role: generateGameRole(selectedGame, effectiveDomain), usageTime: Math.round(duration * 0.3), score: sc };
  } else if (gameMode === 'auto') {
    const scored = LESSON_GAME_CATALOG.map(g => ({ game: g, score: calcGameScore(g, grade, domain, actMode, space, device, focuses) })).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best) {
      recommendedGame = { game: best.game, reason: generateGameReason(best.game, effectiveDomain, gradeKey), role: generateGameRole(best.game, effectiveDomain), usageTime: Math.round(duration * 0.3), score: best.score };
    }
  }

  const gameName = recommendedGame?.game.title || '';
  const gameEmoji = recommendedGame?.game.emoji || '🎮';

  // Step 3: 학습 목표
  const goals = generateGoals(effectiveDomain, unit, gameName, isLowGrade, lowGradeTheme, focuses);
  const successCriteria = generateSuccessCriteria(effectiveDomain, gameName, isLowGrade, focuses);

  // Step 4: 수업 흐름
  const intro = duration < 15 ? Math.max(1, Math.floor(duration * 0.15)) : Math.max(3, Math.round(duration * 0.125));
  const mainTime = duration - intro * 2;
  const wrapUp = duration - intro - mainTime;
  const resolvedMode = actMode === '자동 추천' ? (device === '모둠별 1대' ? '모둠' : recommendedGame?.game.activityModes[0] || '개인') : actMode;
  const lessonFlow = generateLessonFlow(intro, mainTime, wrapUp, gameName, gameEmoji, effectiveDomain, unit, isLowGrade, device, resolvedMode, space, studentCount, focuses, recommendedGame?.game, groupSize);
  if (recommendedGame) recommendedGame.usageTime = lessonFlow.find(phase => phase.stage === '전개 ②')!.time;

  // Step 5: 게임 상세
  const gameDetail = recommendedGame ? generateGameDetail(recommendedGame.game, resolvedMode, device, studentCount, space, groupSize) : null;

  // Step 6: 안전 지도
  const safety = generateSafety(recommendedGame?.game, space, isLowGrade);

  // Step 7: 평가
  const evaluation = generateEvaluation(effectiveDomain, gameName, isLowGrade, focuses);

  // Step 8: 자기평가
  const selfEval = { items: ['오늘 적극적으로 몸을 움직였다.', '친구와 함께 규칙을 지키며 활동했다.', '안전 약속을 잘 지켰다.'] };

  // Step 9: 수준별 조정
  const levelAdjust = generateLevelAdjust(recommendedGame?.game, effectiveDomain);

  // Step 10: 포용
  const inclusion = generateInclusion(recommendedGame?.game);

  // Step 11: 교사 팁
  const teacherTips = generateTeacherTips(device, studentCount, recommendedGame?.game);

  // Step 12: 대체안
  const alternatives = generateAlternatives(recommendedGame?.game, device, space);

  // Step 13: 게임 변형
  const gameVariations = recommendedGame ? generateGameVariations(recommendedGame.game) : [];

  // Step 14: NO DEVICE
  const noDeviceActivity = recommendedGame?.game.noDeviceAlternative || '게임의 핵심 규칙을 교사 구호와 카드로 전환하여 전체 학급이 함께 신체활동을 실시한다.';

  // 핵심 역량
  const competencies = CORE_COMPETENCIES.filter((_, i) => {
    if (effectiveDomain === '운동') return i <= 1;
    if (effectiveDomain === '스포츠') return i === 0 || i === 2;
    return i >= 1;
  }).map(c => c.name);

  const std0 = standards[0];
  return {
    overview: { gradeGroup: grade, duration, unit: unit || `${effectiveDomain} 활동`, topic: unit || `${effectiveDomain} 영역 신체활동`, domain: isLowGrade ? '즐거운 생활 연계' : effectiveDomain, activityMode: resolvedMode, studentCount, space: space === '자동' ? '교사가 확인한 활동 장소' : space },
    curriculum: { domain: isLowGrade ? '통합교과(즐거운 생활) 연계 신체활동' : effectiveDomain, standards, competencies, knowledge: isLowGrade ? '신체활동의 즐거움과 기본 움직임' : (std0?.knowledge || '움직임 원리 이해'), process: isLowGrade ? '다양한 놀이를 통한 신체 탐색' : (std0?.process || '움직임 수행'), attitude: isLowGrade ? '친구와 함께하는 즐거움' : (std0?.attitude || '적극적 참여'), isLowGrade, lowGradeTheme },
    learningGoals: { goals, successCriteria },
    recommendedGame,
    lessonFlow,
    gameDetail,
    safety,
    evaluation,
    selfEval,
    levelAdjust,
    inclusion,
    teacherTips,
    alternatives,
    gameVariations,
    noDeviceActivity,
  };
}

// ─── 보조 생성 함수들 ───
function generateGameReason(game: LessonGameMeta, domain: string, _grade: string): string {
  const skills = game.movementSkills.slice(0, 2).join('과 ');
  if (game.domain === domain) return `「${game.title}」은(는) ${skills}이(가) 반복되어 ${domain} 영역의 학습 내용을 경험하기에 적합합니다.`;
  return `「${game.title}」은(는) ${skills} 활동을 포함하고 있어 현재 수업 조건에 가장 부합하는 게임입니다.`;
}

function generateGameRole(game: LessonGameMeta, _domain: string): string {
  return `전개 단계에서 ${game.learningKeywords.slice(0, 2).join(', ')} 개념을 신체활동으로 체험하는 핵심 도구로 활용`;
}

function generateGoals(domain: string, unit: string, gameName: string, isLow: boolean, theme: string, _focuses: FocusArea[]): string[] {
  if (isLow) {
    return [`다양한 놀이를 통해 ${theme.replace('하기','는 즐거움을 느낄 수 있다.')}`, `친구와 함께 안전 약속을 지키며 신나게 몸을 움직일 수 있다.`];
  }
  const goals: string[] = [];
  if (domain === '운동') {
    goals.push(`${unit || '체력 운동'}의 방법을 알고 자신의 수준에 맞게 수행할 수 있다.`);
    if (gameName) goals.push(`「${gameName}」 활동을 통해 자신의 신체 변화를 관찰하고 말할 수 있다.`);
  } else if (domain === '스포츠') {
    goals.push(`${unit || '스포츠 활동'}에서 상황에 맞는 움직임을 선택하여 수행할 수 있다.`);
    if (gameName) goals.push(`「${gameName}」을(를) 활용하여 전략을 세우고 실행할 수 있다.`);
  } else {
    goals.push(`${unit || '표현 활동'}에서 느낌과 생각을 움직임으로 창의적으로 표현할 수 있다.`);
    if (gameName) goals.push(`「${gameName}」 활동을 통해 다양한 움직임 표현을 탐색하고 감상할 수 있다.`);
  }
  return goals;
}

function generateSuccessCriteria(domain: string, _gameName: string, isLow: boolean, _focuses: FocusArea[]): string[] {
  if (isLow) return ['즐겁게 몸을 움직일 수 있다.', '친구와 함께 놀이에 참여할 수 있다.', '안전 약속을 지킬 수 있다.'];
  const criteria = [];
  if (domain === '운동') { criteria.push('자신의 체력 수준을 파악하고 운동 방법을 설명할 수 있다.', '운동 전후 신체 변화를 비교하여 말할 수 있다.'); }
  else if (domain === '스포츠') { criteria.push('상황에 맞는 움직임을 선택하여 수행할 수 있다.', '규칙을 지키며 게임에 적극적으로 참여할 수 있다.'); }
  else { criteria.push('주제에 맞는 움직임을 다양하게 표현할 수 있다.', '친구의 표현을 감상하고 느낌을 나눌 수 있다.'); }
  criteria.push('안전 약속을 지키며 활동할 수 있다.');
  return criteria;
}

function generateLessonFlow(intro: number, mainTime: number, wrapUp: number, gameName: string, gameEmoji: string, domain: string, _unit: string, isLow: boolean, device: DeviceOption, actMode: ActivityMode, _space: string, students: number, _focuses: FocusArea[], game?: LessonGameMeta, groupSize = 4): GeneratedPlan['lessonFlow'] {
  const flow: GeneratedPlan['lessonFlow'] = [];
  // 도입
  flow.push({
    stage: '도입', time: intro,
    activity: '출석 확인 및 건강 상태 점검\n오늘의 학습 목표 안내\n준비운동 (동적 스트레칭)',
    teacherActivity: '학생 건강 상태를 확인하고\n학습 목표를 명확히 안내한다.',
    studentActivity: '건강 상태를 보고하고\n준비운동에 적극 참여한다.',
    gameUsage: '-',
    materials: '호루라기, 음악 재생 장치',
    safety: '준비운동 시 관절에 무리가 가지 않도록 안내한다.',
    evaluation: '-',
  });

  // 전개 - 활동 분배
  const act1Time = Math.max(1, Math.round(mainTime * 0.35));
  const act2Time = Math.max(1, Math.min(mainTime - act1Time - 1, Math.round(mainTime * 0.4)));
  const act3Time = mainTime - act1Time - act2Time;

  flow.push({
    stage: '전개 ①', time: act1Time,
    activity: `핵심 움직임 탐색\n${isLow ? '놀이를 통한 기본 움직임 경험' : `${domain} 영역 기초 움직임 연습`}`,
    teacherActivity: `핵심 움직임의 요소를 시범하고\n개별 피드백을 제공한다.`,
    studentActivity: `교사 시범을 관찰한 후\n자신의 수준에 맞게 움직임을 시도한다.`,
    gameUsage: '-',
    materials: isLow ? '음악, 활동 카드' : `${game?.movementSkills?.[0] || '움직임'} 관련 준비물`,
    safety: '활동 공간 확보 및 친구와 거리 유지',
    evaluation: '움직임 수행 관찰',
  });

  if (gameName && device !== '없음') {
    flow.push({
      stage: '전개 ②', time: act2Time,
      activity: `${gameEmoji} 「${gameName}」 활용 활동\n게임을 통한 핵심 움직임 적용 및 체험`,
      teacherActivity: `게임 실행 방법을 안내하고\n순회하며 개별 피드백을 제공한다.${device === '교사용 1대' ? '\nTV/스크린에 화면을 공유한다.' : ''}`,
      studentActivity: `${actMode === '모둠' || actMode === '팀 대항' ? '모둠별로 역할을 분담하여' : ''} 게임에 참여하며\n핵심 움직임을 반복 연습한다.\n게임 후 실제 신체활동을 수행한다.`,
      gameUsage: `${gameEmoji} ${gameName} 실행\n${device === '교사용 1대' ? '교사 기기 → TV 연결, 전체 학급 동시 활동' : device === '모둠별 1대' ? `${groupSummary(lessonGroupSizes(students, actMode === '짝' ? 2 : groupSize))} · 모둠별 기기 배분` : '학생 개인 기기 사용'}`,
      materials: `${device === '교사용 1대' ? 'TV/프로젝터, ' : ''}디지털 기기, ${game?.movementSkills?.[0] || ''} 관련 준비물`,
      safety: game?.safetyNotes?.[0] || '게임 화면 확인 후 이동할 때에는 기기를 내려놓고 이동한다.',
      evaluation: '움직임 수행 및 참여도 관찰',
    });
  } else {
    flow.push({
      stage: '전개 ②', time: act2Time,
      activity: gameName ? `${gameEmoji} 「${gameName}」 핵심 규칙 활용 신체활동\n(기기 없이 게임 규칙을 적용한 활동)` : `핵심 움직임 심화 활동\n다양한 상황에서 움직임 적용`,
      teacherActivity: gameName ? `「${gameName}」의 핵심 규칙을 설명하고\n구호/카드로 진행한다.` : '심화 활동을 안내하고 피드백한다.',
      studentActivity: '교사 신호에 맞춰 적극적으로\n신체활동에 참여한다.',
      gameUsage: gameName ? `NO DEVICE: ${game?.noDeviceAlternative || '교사 구호로 진행'}` : '-',
      materials: '호루라기, 활동 카드, 콘',
      safety: '활동 공간 확보 및 충돌 방지',
      evaluation: '움직임 수행 관찰',
    });
  }

  flow.push({
    stage: '전개 ③', time: act3Time,
    activity: `${isLow ? '놀이 변형 및 반복' : '게임 규칙 또는 전략 변형 활동'}\n움직임 적용 및 심화`,
    teacherActivity: `변형 활동을 제안하고\n수준별 피드백을 제공한다.`,
    studentActivity: `변형된 규칙으로 활동하며\n자신만의 전략을 시도한다.`,
    gameUsage: gameName ? `난이도 변경 또는 규칙 변형` : '-',
    materials: '활동 관련 준비물',
    safety: '피로 누적 시 충분한 휴식 제공',
    evaluation: '전략 활용 및 태도 관찰',
  });

  // 정리
  flow.push({
    stage: '정리', time: wrapUp,
    activity: '정리운동 (정적 스트레칭)\n자기평가 및 소감 나누기\n다음 시간 안내',
    teacherActivity: '학습 내용을 정리하고\n자기평가를 안내한다.',
    studentActivity: '정리운동에 참여하고\n오늘의 활동을 되돌아본다.',
    gameUsage: '-',
    materials: '-',
    safety: '충분한 정리운동으로 부상을 예방한다.',
    evaluation: '자기평가 확인',
  });

  return flow;
}

function generateGameDetail(game: LessonGameMeta, actMode: ActivityMode, device: DeviceOption, students: number, space: SpaceOption, groupSize: number): GeneratedPlan['gameDetail'] {
  const sizes = lessonGroupSizes(students, actMode === '짝' ? 2 : groupSize);
  const grouped = device === '모둠별 1대' || actMode === '모둠' || actMode === '팀 대항' || actMode === '짝';
  const place = space === '자동' ? '교사가 확인한 활동 장소' : space;
  const isTeacherDevice = device === '교사용 1대';
  return {
    preparation: device === '없음' ? `기기를 사용하지 않고 진행한다. ${game.noDeviceAlternative}` : isTeacherDevice ? `교사 기기로 「${game.title}」 안내를 공유한다. 기기 1대로 가능한 참여 방식인지 교사가 확인한다.` : `${device === '모둠별 1대' ? `${sizes.length}개 모둠(${groupSummary(sizes)})을 편성하고 모둠별 기기 1대를 배분한다.` : '학생 개인 기기에서 게임을 실행하도록 안내한다.'} 게임 URL 또는 QR 코드를 안내한다.`,
    arrangement: `${place}에서 ${grouped ? `${sizes.length}개 모둠의 활동 구역과` : '개인 활동 구역과'} 이동 동선을 교사가 확인한다. ${space === '좁은 실내 공간' ? '현재 공간에서 어려운 이동은 제자리 대체 동작을 확인하거나 활동을 바꾼다.' : '활동 자료의 준비물·안전 안내를 먼저 확인한다.'} 거리를 일률적인 수치로 정하지 않고 현장 조건에 맞춰 조정한다.`,
    procedure: [
      '본활동에 배정한 시간 안에서 규칙과 안전 약속을 확인한다.',
      device === '없음' ? '기기 없는 대체 활동의 핵심 움직임을 안내한다.' : '기기를 멈춰 둔 상태에서 실행 방법과 핵심 움직임을 안내한다.',
      grouped ? '참여 인원에 맞춰 역할을 나누고 한 차례 활동 뒤 역할을 바꾼다.' : '각자 가능한 범위에서 활동하고 쉬는 방법을 확인한다.',
      '배정된 시간이 끝나기 전에 활동을 멈추고 핵심 움직임을 되돌아본다.',
    ],
    rotation: grouped ? `${groupSummary(sizes)}으로 운영한다. ${device === '모둠별 1대' ? '기기 조작 역할을 한 명씩 번갈아 맡고, 다른 학생은 가능한 몸 활동에 참여한다.' : '활동·안내·확인 역할을 실제 인원에 맞춰 나눈다.'} 한 차례 활동 뒤 역할을 바꾼다.${sizes.includes(1) ? ' 혼자 남는 학생은 교사가 함께할 방법이나 개인 참여 방법을 확인한다.' : ''}` : '개인별 참여와 휴식을 확인한다. 다른 학생과의 비교나 역할은 교사가 참여 인원에 맞춰 조정한다.',
    variation: [`기본: ${game.description}`, `쉬움: 제한 시간을 늘리거나 성공 기준을 낮춘다.`, `도전: 비우세 손/발 사용 또는 이동 범위를 확대한다.`],
    difficulty: game.intensity === '높음' ? '높음 — 중간에 1분 휴식을 제공한다.' : game.intensity === '보통' ? '보통 — 수준에 맞게 조절 가능하다.' : '낮음 — 대부분의 학생이 참여할 수 있다.',
    deviceOps: device === '없음' ? '기기를 사용하지 않는다.' : isTeacherDevice ? '공유 화면이 필요한 활동인지 확인하고, 화면 조작과 몸 활동을 번갈아 진행한다.' : device === '모둠별 1대' ? '기기 조작자를 교대하며, 이동 전 기기를 안전한 자리에 둔다.' : '학생 개인 기기를 사용하되, 게임 시작/종료 시점을 교사가 통제한다.',
  };
}

function generateSafety(game: LessonGameMeta | undefined, space: string, isLow: boolean): string[] {
  const s: string[] = [];
  if (game?.safetyNotes) s.push(...game.safetyNotes);
  if (space === '체육관') s.push('체육관 바닥의 미끄러움 여부를 사전에 확인한다.');
  if (space === '운동장') s.push('운동장 바닥 상태(돌, 웅덩이 등)를 사전에 점검한다.');
  if (space === '교실') s.push('책상과 의자를 정리하여 충분한 활동 공간을 확보한다.');
  s.push('활동 중 몸이 불편한 학생은 즉시 교사에게 알리도록 안내한다.');
  if (isLow) s.push('1~2학년 학생의 발달 수준을 고려하여 과도한 경쟁을 지양한다.');
  return s;
}

function generateEvaluation(domain: string, _gameName: string, isLow: boolean, _focuses: FocusArea[]): GeneratedPlan['evaluation'] {
  if (isLow) return { elements: ['신체활동 참여도', '놀이 규칙 준수', '친구와 어울림'], methods: ['관찰 평가', '자기평가'], checklist: ['즐겁게 몸을 움직인다.', '놀이 규칙을 지킨다.', '친구와 함께 활동한다.', '안전 약속을 지킨다.'] };
  return {
    elements: [`${domain} 움직임 수행 능력`, '활동 참여 태도', '규칙 및 안전 준수'],
    methods: ['교사 관찰 평가', '학생 자기평가', '동료 평가'],
    checklist: [
      domain === '운동' ? '자신의 수준에 맞게 움직임을 수행한다.' : domain === '스포츠' ? '상황에 맞는 움직임을 선택하여 수행한다.' : '주제에 맞는 움직임을 창의적으로 표현한다.',
      '활동에 적극적으로 참여한다.',
      '친구와 의사소통하며 협력한다.',
      '규칙과 안전 약속을 지킨다.',
    ],
  };
}

function generateLevelAdjust(game: LessonGameMeta | undefined, _domain: string): GeneratedPlan['levelAdjust'] {
  return {
    needHelp: [
      game ? `「${game.title}」을 '기본 연습' 배율로 시작하고, 교사가 활동 속도를 낮추거나 수행 기준을 완화한다.` : '활동 범위를 절반으로 줄이고 성공 기준을 완화한다.',
      '교사 또는 또래 도우미가 옆에서 함께 활동한다.',
    ],
    general: [
      '기본 규칙에 따라 활동하고, 개인 기록 향상을 목표로 한다.',
      '짝 또는 모둠에서 자신의 역할을 수행한다.',
    ],
    challenge: [
      game ? `「${game.title}」을 '도전 기록' 배율로 시작하고, 교사가 비우세 손/발 사용 등 추가 수행 조건을 안내한다.` : '활동 범위를 확대하고 추가 전략 조건을 부여한다.',
      '모둠 리더 역할을 맡아 친구들을 이끈다.',
    ],
  };
}

function generateInclusion(game: LessonGameMeta | undefined): string[] {
  return [
    '이동이 어려운 학생: 이동 거리를 줄이거나 앉은 자세에서 참여할 수 있는 대체 동작을 제공한다.',
    '기기 조작이 어려운 학생: 짝이 기기를 조작하고 해당 학생은 신체활동에 집중한다.',
    '체력이 부족한 학생: 활동 강도를 낮추고 충분한 휴식 시간을 보장한다.',
    game ? `「${game.title}」 참여가 어려운 경우: 관찰자 또는 심판 역할을 부여하고 점진적으로 참여를 유도한다.` : '활동 참여가 어려운 경우 관찰자 역할에서 시작하여 점진적으로 참여한다.',
  ];
}

function generateTeacherTips(device: DeviceOption, students: number, game?: LessonGameMeta): GeneratedPlan['teacherTips'] {
  const tips = [];
  if (device !== '없음') tips.push({ problem: '학생들이 화면 앞에 몰릴 경우', solution: '기기 확인 구역과 활동 구역을 명확히 분리한다. "확인 → 이동 → 활동" 순서를 정한다.' });
  if (students > 25) tips.push({ problem: '학생 수가 많아 대기 시간이 길어질 경우', solution: '한 모둠을 두 팀으로 나누어 동시에 움직이게 하거나, 스테이션 순환 방식을 적용한다.' });
  tips.push({ problem: '활동 의욕이 낮은 학생이 있을 경우', solution: '기록 경쟁보다 개인 기록 향상에 초점을 맞추고, 작은 성공 경험을 칭찬한다.' });
  if (game && game.intensity === '높음') tips.push({ problem: '활동 강도가 너무 높아 지치는 학생이 있을 경우', solution: '30초~1분 단위로 활동과 휴식을 교대하고, 물 마시기 시간을 제공한다.' });
  return tips;
}

function generateAlternatives(game: LessonGameMeta | undefined, _device: DeviceOption, _space: string): GeneratedPlan['alternatives'] {
  const alts = [];
  alts.push({ scenario: '태블릿이 1대뿐일 때', solution: 'TV/프로젝터에 연결하여 전체 학급이 화면을 보면서 동시에 신체활동을 실시한다.' });
  alts.push({ scenario: '인터넷이나 기기 사용이 어려울 때', solution: game ? `「${game.title}」의 핵심 규칙을 교사 구호, 카드, 칠판으로 전환하여 진행한다. ${game.noDeviceAlternative}` : '교사 구호와 활동 카드를 이용하여 동일한 움직임 목표로 수업을 진행한다.' });
  alts.push({ scenario: '체육관이 아닌 교실에서 해야 할 때', solution: '책상과 의자를 벽 쪽으로 밀어 중앙에 활동 공간을 만들고, 이동 범위를 제한한 버전으로 진행한다.' });
  alts.push({ scenario: '학생 수가 많을 때 (30명 이상)', solution: '스테이션 순환 방식으로 3~4개 활동 구역을 설치하고, 5분 간격으로 순환한다.' });
  alts.push({ scenario: '공간이 좁을 때', solution: '제자리 활동 위주로 변형하고, 이동 동작은 방향 전환 대신 제자리 스텝으로 대체한다.' });
  return alts;
}

function generateGameVariations(game: LessonGameMeta): GeneratedPlan['gameVariations'] {
  return [
    { level: '기본', description: `「${game.title}」을(를) 원래 방식 그대로 진행한다. ${game.description}` },
    { level: '쉬움', description: `제한 시간을 1.5배로 늘리고, 성공 기준을 절반으로 낮춘다. 이동 거리를 축소하여 부담을 줄인다.` },
    { level: '도전', description: `비우세 손/발을 사용하거나, 활동 범위를 확대한다. 팀 전략 요소(예: 작전 시간 30초 후 실행)를 추가한다.` },
  ];
}
