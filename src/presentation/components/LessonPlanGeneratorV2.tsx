import { useState, useMemo, useRef } from 'react';
import { Search, Sparkles, ChevronDown, ChevronUp, Printer, Copy, Check, RotateCcw, ExternalLink, Play, Shield, BookOpen, Target, Heart, Download } from 'lucide-react';
import { LESSON_GAME_CATALOG } from '../../data/lessonGameCatalog';
import type { LessonGameMeta } from '../../data/lessonGameCatalog';
import { findStandards, LOW_GRADE_THEMES, CORE_COMPETENCIES } from '../../data/curriculumStandards';
import type { CurriculumStandard } from '../../data/curriculumStandards';

// ─── 타입 ───
type GradeGroup = '1~2학년 · 즐거운 생활 연계' | '3~4학년군' | '5~6학년군';
type DomainOption = '자동' | '운동' | '스포츠' | '표현' | '놀이' | '기본 움직임';
type ActivityMode = '자동 추천' | '개인' | '짝' | '모둠' | '팀 대항' | '학급 전체';
type DeviceOption = '없음' | '교사용 1대' | '모둠별 1대' | '학생 1인 1기기';
type SpaceOption = '자동' | '교실' | '체육관' | '운동장' | '다목적실' | '좁은 실내 공간';
type GameSelectMode = 'auto' | 'manual';
type FocusArea = '신체활동량' | '움직임 기능' | '체력' | '전략적 사고' | '협력' | '의사소통' | '창의적 표현' | '건강 관리' | '안전' | '즐거움';

interface GeneratedPlan {
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
function calcGameScore(game: LessonGameMeta, grade: GradeGroup, domain: DomainOption, actMode: ActivityMode, space: SpaceOption, device: DeviceOption, focuses: FocusArea[]): number {
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
function generateLessonPlan(
  grade: GradeGroup, duration: number, domain: DomainOption, unit: string,
  actMode: ActivityMode, studentCount: number, space: SpaceOption, device: DeviceOption,
  focuses: FocusArea[], selectedGame: LessonGameMeta | null, gameMode: GameSelectMode
): GeneratedPlan {
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
  const intro = Math.max(3, Math.round(duration * 0.125));
  const mainTime = duration - intro - Math.max(3, Math.round(duration * 0.125));
  const wrapUp = duration - intro - mainTime;
  const lessonFlow = generateLessonFlow(intro, mainTime, wrapUp, gameName, gameEmoji, effectiveDomain, unit, isLowGrade, device, actMode, space, studentCount, focuses, recommendedGame?.game);

  // Step 5: 게임 상세
  const gameDetail = recommendedGame ? generateGameDetail(recommendedGame.game, actMode, device, studentCount, space) : null;

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
    overview: { gradeGroup: grade, duration, unit: unit || `${effectiveDomain} 활동`, topic: unit || `${effectiveDomain} 영역 신체활동`, domain: isLowGrade ? '즐거운 생활 연계' : effectiveDomain, activityMode: actMode === '자동 추천' ? (recommendedGame?.game.activityModes[0] || '개인') : actMode, studentCount, space: space === '자동' ? '체육관' : space },
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

function generateLessonFlow(intro: number, mainTime: number, wrapUp: number, gameName: string, gameEmoji: string, domain: string, _unit: string, isLow: boolean, device: DeviceOption, actMode: ActivityMode, _space: string, students: number, _focuses: FocusArea[], game?: LessonGameMeta): GeneratedPlan['lessonFlow'] {
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
  const act1Time = Math.round(mainTime * 0.35);
  const act2Time = Math.round(mainTime * 0.4);
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
      gameUsage: `${gameEmoji} ${gameName} 실행\n${device === '교사용 1대' ? '교사 기기 → TV 연결, 전체 학급 동시 활동' : device === '모둠별 1대' ? `${Math.ceil(students / 4)}개 모둠 태블릿 배분` : '학생 개인 기기 사용'}`,
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

function generateGameDetail(game: LessonGameMeta, actMode: ActivityMode, device: DeviceOption, students: number, _space: string): GeneratedPlan['gameDetail'] {
  const groupCount = Math.ceil(students / 4);
  const isTeacherDevice = device === '교사용 1대';
  return {
    preparation: isTeacherDevice ? `교사 기기를 TV/프로젝터에 연결하고 「${game.title}」을 실행한다. 학생은 화면을 보고 동시에 신체활동을 수행한다.` : `${device === '모둠별 1대' ? `${groupCount}개 모둠을 편성하고 모둠별 태블릿 1대를 배분한다.` : '학생 개인 기기에서 게임을 실행하도록 안내한다.'} 게임 URL 또는 QR 코드를 안내한다.`,
    arrangement: isTeacherDevice ? '학생 전원이 TV 화면을 볼 수 있도록 반원형으로 배치하되, 활동 공간을 충분히 확보한다.' : `${actMode === '모둠' || actMode === '팀 대항' ? `체육관을 ${groupCount}개 구역으로 나누어 모둠별 활동 구역을 지정한다.` : '개인 활동 공간(약 2m 간격)을 확보하여 배치한다.'}`,
    procedure: [
      `게임 규칙과 안전 약속을 설명한다. (1분)`,
      `게임을 실행하고 핵심 움직임을 안내한다. (1분)`,
      isTeacherDevice ? `교사 화면에 맞춰 전체 학생이 동시에 신체활동을 수행한다.` : `${device === '모둠별 1대' ? '모둠 내에서 30초~1분 간격으로 역할을 순환한다.' : '개인별로 게임을 진행하며 기록을 확인한다.'}`,
      `게임 결과를 확인하고 핵심 움직임을 되돌아본다. (1분)`,
    ],
    rotation: isTeacherDevice ? '전체 학급이 동시에 참여하므로 역할 순환 없이 진행한다.' : device === '모둠별 1대' ? '4명 모둠에서 1명이 기기를 조작하고 나머지 3명은 실제 움직임을 수행한다. 30초~1분 간격으로 기기 조작자를 순환한다.' : '개인별로 진행하되, 짝과 결과를 비교하는 시간을 제공한다.',
    variation: [`기본: ${game.description}`, `쉬움: 제한 시간을 늘리거나 성공 기준을 낮춘다.`, `도전: 비우세 손/발 사용 또는 이동 범위를 확대한다.`],
    difficulty: game.intensity === '높음' ? '높음 — 중간에 1분 휴식을 제공한다.' : game.intensity === '보통' ? '보통 — 수준에 맞게 조절 가능하다.' : '낮음 — 대부분의 학생이 참여할 수 있다.',
    deviceOps: isTeacherDevice ? 'TV/프로젝터에 미러링하여 전체 학급이 동시에 볼 수 있도록 한다.' : device === '모둠별 1대' ? '모둠장이 태블릿을 관리하고, 게임 실행과 결과 확인을 담당한다.' : '학생 개인 기기를 사용하되, 게임 시작/종료 시점을 교사가 통제한다.',
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
      game ? `「${game.title}」의 난이도를 '쉬움'으로 설정하고, 제한 시간을 1.5배로 늘린다.` : '활동 범위를 절반으로 줄이고 성공 기준을 완화한다.',
      '교사 또는 또래 도우미가 옆에서 함께 활동한다.',
    ],
    general: [
      '기본 규칙에 따라 활동하고, 개인 기록 향상을 목표로 한다.',
      '짝 또는 모둠에서 자신의 역할을 수행한다.',
    ],
    challenge: [
      game ? `「${game.title}」의 난이도를 '도전'으로 설정하고, 비우세 손/발을 사용한다.` : '활동 범위를 확대하고 추가 전략 조건을 부여한다.',
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

// ══════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════
export const LessonPlanGeneratorV2 = () => {

  const printRef = useRef<HTMLDivElement>(null);

  // 기본 설정
  const [grade, setGrade] = useState<GradeGroup>('3~4학년군');
  const [duration, setDuration] = useState(40);
  const [customDuration, setCustomDuration] = useState('');
  const [durationMode, setDurationMode] = useState<'40' | '80' | 'custom'>('40');
  const [domain, setDomain] = useState<DomainOption>('자동');
  const [unit, setUnit] = useState('');
  const [actMode, setActMode] = useState<ActivityMode>('자동 추천');

  // 상세 설정
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [studentCount, setStudentCount] = useState(24);
  const [space, setSpace] = useState<SpaceOption>('자동');
  const [device, setDevice] = useState<DeviceOption>('모둠별 1대');
  const [focuses, setFocuses] = useState<FocusArea[]>(['신체활동량', '즐거움']);

  // 게임 선택
  const [gameSelectMode, setGameSelectMode] = useState<GameSelectMode>('auto');
  const [selectedGame, setSelectedGame] = useState<LessonGameMeta | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [showGamePicker, setShowGamePicker] = useState(false);

  // 결과
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState('');

  // 1~2학년 도메인 옵션
  const isLowGrade = grade === '1~2학년 · 즐거운 생활 연계';
  const domainOptions: DomainOption[] = isLowGrade ? ['자동', '놀이', '기본 움직임', '표현'] : ['자동', '운동', '스포츠', '표현'];

  // 게임 필터링
  const filteredGames = useMemo(() => {
    let games = LESSON_GAME_CATALOG;
    const gradeKey = isLowGrade ? '1~2학년' : grade;
    games = games.filter(g => g.grades.includes(gradeKey));
    if (domain !== '자동' && domain !== '놀이' && domain !== '기본 움직임') games = games.filter(g => g.domain === domain);
    if (gameSearch) games = games.filter(g => g.title.includes(gameSearch) || g.description.includes(gameSearch) || g.learningKeywords.some(k => k.includes(gameSearch)));
    return games;
  }, [grade, domain, gameSearch, isLowGrade]);

  // 수업 시간 처리
  const handleDurationChange = (mode: '40' | '80' | 'custom') => {
    setDurationMode(mode);
    if (mode === '40') setDuration(40);
    else if (mode === '80') setDuration(80);
  };

  const toggleFocus = (f: FocusArea) => {
    setFocuses(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  // 생성
  const handleGenerate = () => {
    const d = durationMode === 'custom' ? (parseInt(customDuration) || 40) : duration;
    const result = generateLessonPlan(grade, d, domain, unit, actMode, studentCount, space, device, focuses, gameSelectMode === 'manual' ? selectedGame : null, gameSelectMode);
    setPlan(result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 다른 게임 추천
  const handleRerollGame = () => {
    if (!plan) return;
    const d = durationMode === 'custom' ? (parseInt(customDuration) || 40) : duration;
    // 현재 추천된 게임을 제외하고 다시 추천
    const currentId = plan.recommendedGame?.game.id;
    const candidates = LESSON_GAME_CATALOG.filter(g => g.id !== currentId);
    const scored = candidates.map(g => ({ game: g, score: calcGameScore(g, grade, domain, actMode, space, device, focuses) })).sort((a, b) => b.score - a.score);
    if (scored[0]) {
      const newPlan = generateLessonPlan(grade, d, domain, unit, actMode, studentCount, space, device, focuses, scored[0].game, 'manual');
      setPlan(newPlan);
    }
  };

  // 복사
  const handleCopyAll = () => {
    if (!plan) return;
    const text = planToText(plan);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySection = (section: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(''), 2000);
  };

  // 인쇄
  const handlePrint = () => { window.print(); };

  // 마크다운 다운로드
  const handleDownloadMd = () => {
    if (!plan) return;
    const md = planToMarkdown(plan);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `지도안_${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── 렌더링 ───
  return (
    <div className="space-y-6">
      {/* 생성된 결과가 있으면 결과 먼저 표시 */}
      {plan ? (
        <div ref={printRef} className="print-area space-y-4">
          {/* 액션 바 */}
          <div className="flex flex-wrap gap-2 print:hidden sticky top-[120px] z-10 bg-slate-950/90 backdrop-blur-md py-3 border-b border-slate-800">
            <button onClick={() => setPlan(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 flex items-center gap-1.5 transition-all border border-slate-700"><RotateCcw className="w-3.5 h-3.5" /> 새로 만들기</button>
            <button onClick={handleRerollGame} className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 rounded-xl text-sm font-bold text-purple-300 flex items-center gap-1.5 transition-all border border-purple-700/50"><Sparkles className="w-3.5 h-3.5" /> 다른 게임 추천</button>
            <button onClick={handleCopyAll} className="px-4 py-2 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-xl text-sm font-bold text-cyan-300 flex items-center gap-1.5 transition-all border border-cyan-700/50">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? '복사됨!' : '전체 복사'}</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 flex items-center gap-1.5 transition-all border border-slate-700"><Printer className="w-3.5 h-3.5" /> 인쇄</button>
            <button onClick={handleDownloadMd} className="px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/50 rounded-xl text-sm font-bold text-emerald-300 flex items-center gap-1.5 transition-all border border-emerald-700/50"><Download className="w-3.5 h-3.5" /> 지도안 다운로드</button>
          </div>

          {/* 📋 수업 개요 */}
          <SectionCard title="📋 수업 개요" id="overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['학년군', plan.overview.gradeGroup], ['수업 시간', `${plan.overview.duration}분`],
                ['교육과정 영역', plan.overview.domain], ['활동 형태', plan.overview.activityMode],
                ['단원/주제', plan.overview.unit], ['학생 수', `${plan.overview.studentCount}명`],
                ['장소', plan.overview.space], ['단원', plan.overview.topic],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-bold mb-1">{label}</div>
                  <div className="text-sm text-white font-bold">{value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 🎯 교육과정 연계 */}
          <SectionCard title="🎯 교육과정 연계" id="curriculum">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {plan.curriculum.competencies.map(c => <span key={c} className="px-2.5 py-1 bg-cyan-900/30 border border-cyan-700/40 rounded-lg text-xs font-bold text-cyan-300">{c}</span>)}
              </div>
              {plan.curriculum.isLowGrade ? (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
                  <p className="text-amber-300 text-sm font-bold mb-1">📌 통합교과(즐거운 생활) 연계 신체활동</p>
                  <p className="text-amber-200/80 text-xs">테마: {plan.curriculum.lowGradeTheme}</p>
                  <p className="text-slate-400 text-xs mt-2">※ 1~2학년은 독립된 체육 교과가 없으므로 성취기준 코드를 별도로 제시하지 않습니다.</p>
                </div>
              ) : plan.curriculum.standards.length > 0 && (
                <div className="space-y-2">
                  {plan.curriculum.standards.map(s => (
                    <div key={s.code} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                      <span className="text-cyan-400 text-xs font-black mr-2">{s.code}</span>
                      <span className="text-white text-sm">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-900/20 rounded-lg p-2.5 border border-blue-800/30"><span className="text-blue-400 font-bold block mb-1">지식·이해</span><span className="text-slate-300">{plan.curriculum.knowledge}</span></div>
                <div className="bg-green-900/20 rounded-lg p-2.5 border border-green-800/30"><span className="text-green-400 font-bold block mb-1">과정·기능</span><span className="text-slate-300">{plan.curriculum.process}</span></div>
                <div className="bg-purple-900/20 rounded-lg p-2.5 border border-purple-800/30"><span className="text-purple-400 font-bold block mb-1">가치·태도</span><span className="text-slate-300">{plan.curriculum.attitude}</span></div>
              </div>
            </div>
          </SectionCard>

          {/* 🌱 오늘의 배움 */}
          <SectionCard title="🌱 오늘의 배움" id="goals">
            <div className="space-y-3">
              <div className="space-y-2">{plan.learningGoals.goals.map((g, i) => <div key={i} className="bg-emerald-900/20 rounded-xl p-3 border border-emerald-700/30 text-sm text-white font-medium">📌 {g}</div>)}</div>
              <div><p className="text-xs text-slate-400 font-bold mb-2">성공 기준</p><div className="space-y-1">{plan.learningGoals.successCriteria.map((c, i) => <div key={i} className="text-xs text-slate-300 flex items-start gap-2"><span className="text-emerald-400 mt-0.5">☐</span>{c}</div>)}</div></div>
            </div>
          </SectionCard>

          {/* 🎮 추천 게임 */}
          {plan.recommendedGame && (
            <SectionCard title="🎮 추천 땀방울 원정대 게임" id="game">
              <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-2xl p-4 border border-purple-700/40">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{plan.recommendedGame.game.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-white">{plan.recommendedGame.game.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{plan.recommendedGame.game.description}</p>
                    <p className="text-xs text-purple-300 mt-2 font-medium">💡 {plan.recommendedGame.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">📍 {plan.recommendedGame.role}</p>
                    <p className="text-xs text-slate-400 mt-1">⏱ 권장 사용 시간: {plan.recommendedGame.usageTime}분</p>
                    <div className="flex gap-2 mt-3 print:hidden">
                      <button onClick={() => window.open(plan.recommendedGame!.game.route, '_blank')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold text-white flex items-center gap-1 transition-all"><Play className="w-3 h-3" /> 게임 실행</button>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* 🗺 수업 흐름 */}
          <SectionCard title="🗺 수업 흐름" id="flow" copyText={plan.lessonFlow.map(f => `[${f.stage}] ${f.time}분\n${f.activity}`).join('\n\n')} onCopy={(t) => handleCopySection('flow', t)} copiedSection={copiedSection === 'flow'}>
            <div className="space-y-3">
              {plan.lessonFlow.map((f, i) => (
                <div key={i} className={`rounded-xl p-4 border ${f.stage === '도입' ? 'bg-blue-900/15 border-blue-700/30' : f.stage === '정리' ? 'bg-amber-900/15 border-amber-700/30' : 'bg-emerald-900/15 border-emerald-700/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${f.stage === '도입' ? 'bg-blue-600 text-white' : f.stage === '정리' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>{f.stage}</span>
                    <span className="text-sm font-bold text-white">{f.time}분</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500 font-bold block mb-1">교수·학습 활동</span><span className="text-white whitespace-pre-line">{f.activity}</span></div>
                    <div><span className="text-slate-500 font-bold block mb-1">교사 활동</span><span className="text-slate-300 whitespace-pre-line">{f.teacherActivity}</span></div>
                    <div><span className="text-slate-500 font-bold block mb-1">학생 활동</span><span className="text-slate-300 whitespace-pre-line">{f.studentActivity}</span></div>
                    {f.gameUsage !== '-' && <div><span className="text-purple-400 font-bold block mb-1">🎮 게임 활용</span><span className="text-purple-200 whitespace-pre-line">{f.gameUsage}</span></div>}
                    <div><span className="text-slate-500 font-bold block mb-1">안전 유의점</span><span className="text-red-300/80 whitespace-pre-line">{f.safety}</span></div>
                    {f.evaluation !== '-' && <div><span className="text-slate-500 font-bold block mb-1">평가 포인트</span><span className="text-cyan-300/80">{f.evaluation}</span></div>}
                  </div>
                </div>
              ))}
              <div className="text-right text-xs font-bold text-slate-400">⏱ 총 수업 시간: {plan.lessonFlow.reduce((a, f) => a + f.time, 0)}분</div>
            </div>
          </SectionCard>

          {/* 🎮 게임 활용 상세 */}
          {plan.gameDetail && (
            <SectionCard title="🎮 게임 활용 상세" id="gameDetail">
              <div className="space-y-3 text-sm">
                {[
                  ['🔧 준비', plan.gameDetail.preparation],
                  ['👥 배치', plan.gameDetail.arrangement],
                  ['🔄 역할 순환', plan.gameDetail.rotation],
                  ['📱 기기 운영', plan.gameDetail.deviceOps],
                  ['📊 난이도', plan.gameDetail.difficulty],
                ].map(([label, text]) => (
                  <div key={label as string} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
                    <span className="text-slate-400 text-xs font-bold block mb-1">{label}</span>
                    <span className="text-slate-200 text-xs">{text}</span>
                  </div>
                ))}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
                  <span className="text-slate-400 text-xs font-bold block mb-1">📋 진행 순서</span>
                  <ol className="list-decimal list-inside space-y-1">{plan.gameDetail.procedure.map((p, i) => <li key={i} className="text-xs text-slate-200">{p}</li>)}</ol>
                </div>
              </div>
            </SectionCard>
          )}

          {/* 🛡 안전 지도 */}
          <SectionCard title="🛡 안전 지도" id="safety">
            <ul className="space-y-1.5">{plan.safety.map((s, i) => <li key={i} className="text-xs text-slate-300 flex items-start gap-2"><Shield className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </SectionCard>

          {/* 🔍 과정 중심 평가 */}
          <SectionCard title="🔍 과정 중심 평가" id="eval">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">{plan.evaluation.elements.map(e => <span key={e} className="px-2 py-1 bg-cyan-900/30 border border-cyan-700/40 rounded-lg text-[10px] font-bold text-cyan-300">{e}</span>)}</div>
              <div><p className="text-xs text-slate-400 font-bold mb-2">관찰 체크리스트</p>{plan.evaluation.checklist.map((c, i) => <div key={i} className="text-xs text-slate-300 flex items-start gap-2 mb-1"><span className="text-cyan-400 mt-0.5">☐</span>{c}</div>)}</div>
            </div>
          </SectionCard>

          {/* 🙋 학생 자기평가 */}
          <SectionCard title="🙋 학생 자기평가" id="selfEval">
            <div className="flex gap-4 mb-3">{['😊 잘했어요', '🙂 조금 더 연습할래요', '😐 아직 어려워요'].map(e => <span key={e} className="px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 border border-slate-700">{e}</span>)}</div>
            {plan.selfEval.items.map((it, i) => <div key={i} className="text-xs text-slate-300 flex items-start gap-2 mb-1"><span className="text-emerald-400">☐</span>{it}</div>)}
          </SectionCard>

          {/* 🔄 수준별 활동 조정 */}
          <SectionCard title="🔄 수준별 활동 조정" id="level">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: '🌱 도움이 필요한 학생', items: plan.levelAdjust.needHelp, color: 'blue' },
                { label: '🌿 일반 학생', items: plan.levelAdjust.general, color: 'green' },
                { label: '🌳 도전이 필요한 학생', items: plan.levelAdjust.challenge, color: 'purple' },
              ].map(({ label, items, color }) => (
                <div key={label} className={`bg-${color}-900/15 rounded-xl p-3 border border-${color}-700/30`}>
                  <p className={`text-xs font-bold text-${color}-300 mb-2`}>{label}</p>
                  {items.map((it, i) => <p key={i} className="text-[11px] text-slate-300 mb-1">• {it}</p>)}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ♿ 모두가 참여하는 수업 */}
          <SectionCard title="♿ 모두가 참여하는 수업" id="inclusion">
            <ul className="space-y-1.5">{plan.inclusion.map((s, i) => <li key={i} className="text-xs text-slate-300 flex items-start gap-2"><Heart className="w-3 h-3 text-pink-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
          </SectionCard>

          {/* 💡 교사 TIP */}
          <SectionCard title="💡 교사 TIP" id="tips">
            {plan.teacherTips.map((t, i) => (
              <div key={i} className="bg-amber-900/15 rounded-xl p-3 border border-amber-700/30 mb-2">
                <p className="text-xs font-bold text-amber-300 mb-1">❓ {t.problem}</p>
                <p className="text-xs text-slate-300">→ {t.solution}</p>
              </div>
            ))}
          </SectionCard>

          {/* 🎮 게임 변형 */}
          {plan.gameVariations.length > 0 && (
            <SectionCard title="🎮 게임 변형 수업" id="variations">
              {plan.gameVariations.map((v, i) => (
                <div key={i} className={`rounded-xl p-3 border mb-2 ${v.level === '기본' ? 'bg-slate-800/40 border-slate-700/40' : v.level === '쉬움' ? 'bg-blue-900/15 border-blue-700/30' : 'bg-purple-900/15 border-purple-700/30'}`}>
                  <span className={`text-xs font-black ${v.level === '기본' ? 'text-slate-300' : v.level === '쉬움' ? 'text-blue-300' : 'text-purple-300'}`}>[{v.level}]</span>
                  <p className="text-xs text-slate-300 mt-1">{v.description}</p>
                </div>
              ))}
            </SectionCard>
          )}

          {/* 🔀 이렇게 바꿔도 좋아요 */}
          <SectionCard title="🔀 이렇게 바꿔도 좋아요" id="alternatives">
            {plan.alternatives.map((a, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40 mb-2">
                <p className="text-xs font-bold text-cyan-300 mb-1">📌 {a.scenario}</p>
                <p className="text-xs text-slate-300">{a.solution}</p>
              </div>
            ))}
          </SectionCard>

          {/* 📵 NO DEVICE 대체 활동 */}
          <SectionCard title="📵 NO DEVICE 대체 활동" id="noDevice">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <p className="text-sm text-white">{plan.noDeviceActivity}</p>
            </div>
          </SectionCard>

          {/* 푸터 */}
          <div className="text-center pt-4 border-t border-slate-800">
            <p className="text-slate-500 text-[10px]">© 땀방울 원정대 수업 지도안 생성기 · 2022 개정 초등 체육과 교육과정 연계</p>
          </div>
        </div>
      ) : (
        /* ═══ 입력 폼 ═══ */
        <div className="space-y-5">
          {/* 기본 설정 */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-400" /> 기본 수업 설정</h3>

            {/* 학년군 */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-2">① 학년군</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1~2학년 · 즐거운 생활 연계', '3~4학년군', '5~6학년군'] as GradeGroup[]).map(g => (
                  <button key={g} onClick={() => { setGrade(g); setDomain('자동'); setSelectedGame(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${grade === g ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 수업 시간 */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-2">② 수업 시간</label>
              <div className="flex gap-2">
                {[{ key: '40', label: '40분' }, { key: '80', label: '80분' }, { key: 'custom', label: '직접 입력' }].map(({ key, label }) => (
                  <button key={key} onClick={() => handleDurationChange(key as any)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${durationMode === key ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {durationMode === 'custom' && <input type="number" value={customDuration} onChange={e => { setCustomDuration(e.target.value); setDuration(parseInt(e.target.value) || 40); }} placeholder="분 단위 입력" className="mt-2 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-cyan-500 focus:outline-none" />}
            </div>

            {/* 교육과정 영역 */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-2">③ 교육과정 영역</label>
              <div className="flex flex-wrap gap-2">
                {domainOptions.map(d => (
                  <button key={d} onClick={() => { setDomain(d); setSelectedGame(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${domain === d ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 단원/주제 */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-2">④ 단원 또는 수업 주제</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="예: 전략형 스포츠 - 빈 공간을 활용하며 게임하기" className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none" />
            </div>

            {/* 활동 형태 */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-2">⑤ 활동 형태</label>
              <div className="flex flex-wrap gap-2">
                {(['자동 추천', '개인', '짝', '모둠', '팀 대항', '학급 전체'] as ActivityMode[]).map(m => (
                  <button key={m} onClick={() => setActMode(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${actMode === m ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상세 설정 */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-4 flex items-center justify-between text-sm font-bold text-slate-300 hover:text-white transition-colors">
              <span className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> 상세 설정</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="p-5 pt-0 space-y-4 border-t border-slate-700/50">
                {/* 학급 인원 */}
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-2">⑥ 학급 인원</label>
                  <input type="number" value={studentCount} onChange={e => setStudentCount(parseInt(e.target.value) || 24)} className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-cyan-500 focus:outline-none" />
                </div>

                {/* 장소 */}
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-2">⑦ 수업 장소</label>
                  <div className="flex flex-wrap gap-2">
                    {(['자동', '교실', '체육관', '운동장', '다목적실', '좁은 실내 공간'] as SpaceOption[]).map(s => (
                      <button key={s} onClick={() => setSpace(s)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${space === s ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* 기기 */}
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-2">⑧ 디지털 기기</label>
                  <div className="flex flex-wrap gap-2">
                    {(['없음', '교사용 1대', '모둠별 1대', '학생 1인 1기기'] as DeviceOption[]).map(d => (
                      <button key={d} onClick={() => setDevice(d)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${device === d ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>{d}</button>
                    ))}
                  </div>
                </div>

                {/* 수업 중점 */}
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-2">⑩ 수업 중점 (복수 선택)</label>
                  <div className="flex flex-wrap gap-2">
                    {(['신체활동량', '움직임 기능', '체력', '전략적 사고', '협력', '의사소통', '창의적 표현', '건강 관리', '안전', '즐거움'] as FocusArea[]).map(f => (
                      <button key={f} onClick={() => toggleFocus(f)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${focuses.includes(f) ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 게임 선택 */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> 땀방울 원정대 게임</h3>
            <div className="flex gap-2">
              <button onClick={() => { setGameSelectMode('auto'); setSelectedGame(null); setShowGamePicker(false); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${gameSelectMode === 'auto' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>🤖 자동 추천</button>
              <button onClick={() => { setGameSelectMode('manual'); setShowGamePicker(true); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${gameSelectMode === 'manual' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}>🎯 직접 선택</button>
            </div>

            {/* 선택된 게임 표시 */}
            {selectedGame && (
              <div className="bg-purple-900/20 rounded-xl p-3 border border-purple-700/30 flex items-center gap-3">
                <span className="text-2xl">{selectedGame.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{selectedGame.title}</p>
                  <p className="text-[10px] text-slate-400">{selectedGame.description}</p>
                </div>
                <button onClick={() => setSelectedGame(null)} className="text-xs text-slate-500 hover:text-red-400">✕</button>
              </div>
            )}

            {/* 게임 선택 UI */}
            {showGamePicker && gameSelectMode === 'manual' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type="text" value={gameSearch} onChange={e => setGameSearch(e.target.value)} placeholder="게임 이름 또는 키워드 검색" className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredGames.map(g => (
                    <button key={g.id} onClick={() => { setSelectedGame(g); setShowGamePicker(false); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all hover:bg-slate-700/50 ${selectedGame?.id === g.id ? 'bg-purple-900/30 border-purple-600' : 'bg-slate-900/50 border-slate-700/50'}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{g.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{g.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{g.domain}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${g.intensity === '높음' ? 'bg-red-900/30 text-red-300 border-red-700/40' : g.intensity === '보통' ? 'bg-amber-900/30 text-amber-300 border-amber-700/40' : 'bg-green-900/30 text-green-300 border-green-700/40'}`}>{g.intensity}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{g.description}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-600 shrink-0" />
                      </div>
                    </button>
                  ))}
                  {filteredGames.length === 0 && <p className="text-xs text-slate-500 text-center py-4">조건에 맞는 게임이 없습니다.</p>}
                </div>
              </div>
            )}
          </div>

          {/* 생성 버튼 */}
          <button onClick={handleGenerate}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]">
            <Sparkles className="w-5 h-5" /> 수업 지도안 생성
          </button>
        </div>
      )}
    </div>
  );
};

// ─── 섹션 카드 컴포넌트 ───
function SectionCard({ title, id, children, copyText, onCopy, copiedSection }: { title: string; id: string; children: React.ReactNode; copyText?: string; onCopy?: (text: string) => void; copiedSection?: boolean }) {
  return (
    <div id={id} className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-white">{title}</h3>
        {copyText && onCopy && (
          <button onClick={() => onCopy(copyText)} className="text-xs text-slate-500 hover:text-cyan-400 print:hidden flex items-center gap-1">
            {copiedSection ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedSection ? '복사됨' : '복사'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── 전체 텍스트 변환 ───
function planToText(plan: GeneratedPlan): string {
  let t = '';
  t += `📋 수업 개요\n━━━━━━━━━━━━━━━━━━━━\n`;
  t += `학년군: ${plan.overview.gradeGroup}\n수업 시간: ${plan.overview.duration}분\n`;
  t += `단원: ${plan.overview.unit}\n영역: ${plan.overview.domain}\n활동 형태: ${plan.overview.activityMode}\n`;
  t += `학생 수: ${plan.overview.studentCount}명\n장소: ${plan.overview.space}\n\n`;

  t += `🎯 교육과정 연계\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (plan.curriculum.isLowGrade) {
    t += `통합교과(즐거운 생활) 연계 신체활동\n테마: ${plan.curriculum.lowGradeTheme}\n`;
  } else {
    plan.curriculum.standards.forEach(s => { t += `${s.code} ${s.text}\n`; });
  }
  t += `핵심 역량: ${plan.curriculum.competencies.join(', ')}\n`;
  t += `지식·이해: ${plan.curriculum.knowledge}\n과정·기능: ${plan.curriculum.process}\n가치·태도: ${plan.curriculum.attitude}\n\n`;

  t += `🌱 학습 목표\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.learningGoals.goals.forEach(g => { t += `• ${g}\n`; });
  t += `\n성공 기준:\n`;
  plan.learningGoals.successCriteria.forEach(c => { t += `☐ ${c}\n`; });
  t += '\n';

  if (plan.recommendedGame) {
    t += `🎮 추천 게임: ${plan.recommendedGame.game.emoji} ${plan.recommendedGame.game.title}\n`;
    t += `추천 이유: ${plan.recommendedGame.reason}\n`;
    t += `권장 사용 시간: ${plan.recommendedGame.usageTime}분\n\n`;
  }

  t += `🗺 수업 흐름\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.lessonFlow.forEach(f => {
    t += `[${f.stage}] ${f.time}분\n`;
    t += `활동: ${f.activity}\n교사: ${f.teacherActivity}\n학생: ${f.studentActivity}\n`;
    if (f.gameUsage !== '-') t += `게임: ${f.gameUsage}\n`;
    t += `안전: ${f.safety}\n\n`;
  });

  t += `🛡 안전 지도\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.safety.forEach(s => { t += `• ${s}\n`; });
  t += '\n';

  t += `🔍 평가 체크리스트\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.evaluation.checklist.forEach(c => { t += `☐ ${c}\n`; });
  t += '\n';

  t += `💡 교사 TIP\n━━━━━━━━━━━━━━━━━━━━\n`;
  plan.teacherTips.forEach(tip => { t += `❓ ${tip.problem}\n→ ${tip.solution}\n\n`; });

  t += `📵 NO DEVICE 대체 활동\n━━━━━━━━━━━━━━━━━━━━\n`;
  t += `${plan.noDeviceActivity}\n\n`;

  t += `© 땀방울 원정대 수업 지도안 생성기\n`;
  return t;
}

function planToMarkdown(plan: GeneratedPlan): string {
  let md = '';

  md += `# 📋 수업 지도안\n\n`;
  md += `> 땀방울 원정대 · 2022 개정 초등 체육과 교육과정 연계\n\n`;

  // 수업 개요
  md += `## 📋 수업 개요\n\n`;
  md += `| 항목 | 내용 |\n|------|------|\n`;
  md += `| 학년군 | ${plan.overview.gradeGroup} |\n`;
  md += `| 수업 시간 | ${plan.overview.duration}분 |\n`;
  md += `| 단원/주제 | ${plan.overview.unit} |\n`;
  md += `| 교육과정 영역 | ${plan.overview.domain} |\n`;
  md += `| 활동 형태 | ${plan.overview.activityMode} |\n`;
  md += `| 학생 수 | ${plan.overview.studentCount}명 |\n`;
  md += `| 장소 | ${plan.overview.space} |\n\n`;

  // 교육과정 연계
  md += `## 🎯 교육과정 연계\n\n`;
  if (plan.curriculum.isLowGrade) {
    md += `**통합교과(즐거운 생활) 연계 신체활동**\n\n`;
    md += `- 테마: ${plan.curriculum.lowGradeTheme}\n`;
    md += `- ※ 1~2학년은 독립된 체육 교과가 없으므로 성취기준 코드를 별도로 제시하지 않습니다.\n\n`;
  } else if (plan.curriculum.standards.length > 0) {
    plan.curriculum.standards.forEach(s => { md += `- **${s.code}** ${s.text}\n`; });
    md += '\n';
  }
  md += `**핵심 역량:** ${plan.curriculum.competencies.join(', ')}\n\n`;
  md += `| 지식·이해 | 과정·기능 | 가치·태도 |\n|-----------|----------|----------|\n`;
  md += `| ${plan.curriculum.knowledge} | ${plan.curriculum.process} | ${plan.curriculum.attitude} |\n\n`;

  // 학습 목표
  md += `## 🌱 학습 목표\n\n`;
  plan.learningGoals.goals.forEach(g => { md += `- 📌 ${g}\n`; });
  md += `\n### 성공 기준\n\n`;
  plan.learningGoals.successCriteria.forEach(c => { md += `- [ ] ${c}\n`; });
  md += '\n';

  // 추천 게임
  if (plan.recommendedGame) {
    md += `## 🎮 추천 게임\n\n`;
    md += `**${plan.recommendedGame.game.emoji} ${plan.recommendedGame.game.title}**\n\n`;
    md += `- 추천 이유: ${plan.recommendedGame.reason}\n`;
    md += `- 수업 속 역할: ${plan.recommendedGame.role}\n`;
    md += `- 권장 사용 시간: ${plan.recommendedGame.usageTime}분\n\n`;
  }

  // 수업 흐름
  md += `## 🗺 수업 흐름\n\n`;
  md += `| 단계 | 시간 | 교수·학습 활동 | 교사 활동 | 학생 활동 | 안전 유의점 |\n`;
  md += `|------|------|---------------|----------|----------|------------|\n`;
  plan.lessonFlow.forEach(f => {
    md += `| ${f.stage} | ${f.time}분 | ${f.activity.replace(/\n/g, ' ')} | ${f.teacherActivity.replace(/\n/g, ' ')} | ${f.studentActivity.replace(/\n/g, ' ')} | ${f.safety.replace(/\n/g, ' ')} |\n`;
  });
  md += `\n⏱ **총 수업 시간:** ${plan.lessonFlow.reduce((a, f) => a + f.time, 0)}분\n\n`;

  // 게임 활용 상세
  if (plan.gameDetail) {
    md += `## 🎮 게임 활용 상세\n\n`;
    md += `- **준비:** ${plan.gameDetail.preparation}\n`;
    md += `- **배치:** ${plan.gameDetail.arrangement}\n`;
    md += `- **역할 순환:** ${plan.gameDetail.rotation}\n`;
    md += `- **기기 운영:** ${plan.gameDetail.deviceOps}\n`;
    md += `- **난이도:** ${plan.gameDetail.difficulty}\n\n`;
    md += `### 진행 순서\n\n`;
    plan.gameDetail.procedure.forEach((p, i) => { md += `${i + 1}. ${p}\n`; });
    md += '\n';
  }

  // 안전 지도
  md += `## 🛡 안전 지도\n\n`;
  plan.safety.forEach(s => { md += `- ${s}\n`; });
  md += '\n';

  // 평가
  md += `## 🔍 과정 중심 평가\n\n`;
  md += `**평가 요소:** ${plan.evaluation.elements.join(', ')}\n\n`;
  md += `### 관찰 체크리스트\n\n`;
  plan.evaluation.checklist.forEach(c => { md += `- [ ] ${c}\n`; });
  md += '\n';

  // 자기평가
  md += `## 🙋 학생 자기평가\n\n`;
  plan.selfEval.items.forEach(it => { md += `- [ ] ${it}\n`; });
  md += '\n';

  // 수준별
  md += `## 🔄 수준별 활동 조정\n\n`;
  md += `### 🌱 도움이 필요한 학생\n\n`;
  plan.levelAdjust.needHelp.forEach(it => { md += `- ${it}\n`; });
  md += `\n### 🌿 일반 학생\n\n`;
  plan.levelAdjust.general.forEach(it => { md += `- ${it}\n`; });
  md += `\n### 🌳 도전이 필요한 학생\n\n`;
  plan.levelAdjust.challenge.forEach(it => { md += `- ${it}\n`; });
  md += '\n';

  // 포용
  md += `## ♿ 모두가 참여하는 수업\n\n`;
  plan.inclusion.forEach(s => { md += `- ${s}\n`; });
  md += '\n';

  // 교사 TIP
  md += `## 💡 교사 TIP\n\n`;
  plan.teacherTips.forEach(t => {
    md += `**❓ ${t.problem}**\n\n→ ${t.solution}\n\n`;
  });

  // 게임 변형
  if (plan.gameVariations.length > 0) {
    md += `## 🎮 게임 변형 수업\n\n`;
    plan.gameVariations.forEach(v => {
      md += `**[${v.level}]** ${v.description}\n\n`;
    });
  }

  // 대안
  md += `## 🔀 이렇게 바꿔도 좋아요\n\n`;
  plan.alternatives.forEach(a => {
    md += `**📌 ${a.scenario}**\n\n${a.solution}\n\n`;
  });

  // NO DEVICE
  md += `## 📵 NO DEVICE 대체 활동\n\n`;
  md += `${plan.noDeviceActivity}\n\n`;

  md += `---\n\n`;
  md += `*© 땀방울 원정대 수업 지도안 생성기 · 2022 개정 초등 체육과 교육과정 연계*\n`;

  return md;
}
