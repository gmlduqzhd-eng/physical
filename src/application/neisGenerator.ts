// 2022 개정 초등 체육과 교육과정 연계 NEIS 세특(세부능력 및 특기사항) 자동 생성 엔진
import type { RoomGroup, GameRoom } from '../domain/types';

export type GradeGroupKey = '1~2학년' | '3~4학년군' | '5~6학년군';
export type DomainKey = 'all' | 'exercise' | 'sports' | 'expression' | 'attitude';
export type AchievementLevel = 'high' | 'mid' | 'low';

export interface NeisCommentResult {
  groupId: string;
  groupName: string;
  rank: number;
  score: number;
  missionsCount: number;
  isDefused: boolean;
  level: AchievementLevel;
  standardCodes: string[];
  standardTitle: string;
  comment: string;
  charCount: number;
  byteCount: number;
}

export interface NeisGeneratorOptions {
  gradeGroup: GradeGroupKey;
  domain: DomainKey;
  customActivityName?: string;
  forceLevel?: AchievementLevel;
}

// 한글 3바이트(UTF-8) / 나이스 기준 2~3바이트 바이트 계산기
export function calculateKoreanByte(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode <= 0x007f) {
      bytes += 1;
    } else if (charCode <= 0x07ff) {
      bytes += 2;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

// 점수 및 활동 결과를 기반으로 기본 성취수준 자동 판정
export function evaluateLevel(group: RoomGroup, allGroups: RoomGroup[]): AchievementLevel {
  if (allGroups.length <= 1) {
    if (group.is_defused || (group.completed_missions?.length || 0) >= 3) return 'high';
    if ((group.score || 0) > 0) return 'mid';
    return 'low';
  }

  const sorted = [...allGroups].sort((a, b) => (b.score || 0) - (a.score || 0));
  const rank = sorted.findIndex(g => g.id === group.id);
  const total = sorted.length;
  const ratio = (rank + 1) / total;

  if (ratio <= 0.35 || group.is_defused) return 'high';
  if (ratio <= 0.8) return 'mid';
  return 'low';
}

// 1~2학년 즐거운 생활 신체활동 문구 생성기
function generateGrade12Comment(
  groupName: string,
  level: AchievementLevel,
  domain: DomainKey,
  missionsCount: number
): { comment: string; standardCodes: string[]; standardTitle: string } {
  const standardCodes = ['[즐거운 생활-신체활동]'];
  const missionText = missionsCount > 0 ? `다양한 신체놀이 미션(${missionsCount}단계)을 완수하며 ` : '신체놀이에 참여하며 ';

  if (level === 'high') {
    if (domain === 'expression') {
      return {
        standardCodes,
        standardTitle: '느낌과 생각을 몸으로 표현하기',
        comment: `'${groupName}' 모둠 활동에서 ${missionText}음악과 신호에 맞추어 느낌과 생각을 창의적인 신체 동작으로 표현함. 친구들의 움직임을 주의 깊게 관찰하고 긍정적으로 호응하며, 모둠원 모두가 즐겁게 활동에 참여할 수 있도록 밝은 에너지를 발휘함.`,
      };
    }
    if (domain === 'sports' || domain === 'attitude') {
      return {
        standardCodes,
        standardTitle: '친구와 함께하는 협동 신체놀이',
        comment: `'${groupName}' 모둠 활동에서 친구들과 신체놀이 규칙과 안전 약속을 철저히 준수함. ${missionText}어려워하는 친구의 손을 잡고 이끌어주며 협동의 기쁨을 몸소 실천하였고, 놀이 상황에서 정정당당하게 참여하는 태도가 매우 모범적임.`,
      };
    }
    return {
      standardCodes,
      standardTitle: '기본 움직임 탐색 및 신체 조절',
      comment: `'${groupName}' 모둠 활동에서 ${missionText}걷기, 달리기, 점프 등 기본 움직임을 상황에 알맞게 조절하며 순발력과 신체 균형 감각을 탁월하게 발휘함. 신체활동의 즐거움을 온몸으로 표현하고 안전 약속을 지키며 활발하게 참여함.`,
    };
  }

  if (level === 'mid') {
    return {
      standardCodes,
      standardTitle: '규칙을 지키는 즐거운 신체놀이',
      comment: `'${groupName}' 모둠의 일원으로서 ${missionText}신체놀이에 성실하게 참여하고, 모둠원들과 호흡을 맞추어 안전하게 이동하고 활동함. 선생님과 친구들의 안내를 경청하며 기본 움직임 동작을 적극적으로 시도하고 협력함.`,
    };
  }

  return {
    standardCodes,
    standardTitle: '기본 신체놀이 참여와 적응',
    comment: `'${groupName}' 모둠의 신체놀이에 흥미를 갖고 점진적으로 참여하려는 노력을 보임. 선생님과 친구들의 따뜻한 격려 속에서 기본 움직임 규칙을 하나씩 익혀나가며, 안전하게 참여하려는 긍정적인 태도를 기르고 있음.`,
  };
}

// 3~4학년군 체육과 성취기준 연계 문구 생성기
function generateGrade34Comment(
  groupName: string,
  level: AchievementLevel,
  domain: DomainKey,
  activityName: string,
  missionsCount: number,
  isDefused: boolean
): { comment: string; standardCodes: string[]; standardTitle: string } {
  if (domain === 'sports') {
    const standardCodes = ['[4체02-06]', '[4체02-09]'];
    const title = '전략형 스포츠 및 게임 규칙 준수';
    if (level === 'high') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[4체02-06, 4체02-09] 전략형 스포츠 및 신체 미션 챌린지에서 '${groupName}' 모둠원들과 함께 미션 해결 전략을 주도적으로 수립하고 실행함. 움직임의 요소(시간, 공간, 힘)를 효율적으로 활용하여 ${missionsCount}개의 과제를 완수하였으며, 정정당당한 태도와 배려심으로 모둠 승리에 결정적인 역할을 수행함.`,
      };
    }
    if (level === 'mid') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[4체02-06] 전략형 신체활동 게임에 적극 참여하여 '${groupName}' 모둠원들과 정해진 역할을 충실히 분담하고 수행함. 게임 규칙과 안전 수칙을 지키며 모둠의 목표를 달성하기 위해 최선을 다하는 페어플레이 정신을 발휘함.`,
      };
    }
    return {
      standardCodes: ['[4체02-09]'],
      standardTitle: '게임 규칙 이해와 협동 노력',
      comment: `[4체02-09] '${groupName}' 모둠 대항 신체활동 게임의 기본 규칙을 이해하고 규칙을 지키며 활동에 참여함. 모둠원들의 조언과 격려를 경청하며 팀 과제 수행에 협력하려는 태도를 성실히 보여줌.`,
    };
  }

  if (domain === 'expression') {
    const standardCodes = ['[4체03-02]', '[4체03-04]'];
    const title = '움직임 요소 표현 및 창의적 신체 표현';
    if (level === 'high') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[4체03-02, 4체03-04] 신체활동 미션에서 움직임 요소(공간, 힘, 시간)의 변화를 창의적으로 탐색하고 자신감 넘치는 신체 동작으로 표현함. '${groupName}' 모둠원들의 움직임에 호응하며 조화로운 협동 동작을 선보이고, 뛰어난 신체 조절 능력을 발휘함.`,
      };
    }
    if (level === 'mid') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[4체03-02] 다양한 신체 움직임 요소를 탐색하고 주어진 미션 동작을 바르게 따라 하며 표현 활동에 성실히 참여함. 서로의 움직임을 존중하며 '${groupName}' 모둠원과 함께 즐겁게 활동함.`,
      };
    }
    return {
      standardCodes: ['[4체03-01]'],
      standardTitle: '움직임 표현 시도와 참여',
      comment: `[4체03-01] 신체 표현 활동에 관심을 갖고 기본 움직임 동작을 단계별로 시도함. '${groupName}' 모둠원들의 동작을 관찰하며 자신감을 갖고 표현하려는 노력을 꾸준히 보임.`,
    };
  }

  // 기본/운동/체력 영역
  const standardCodes = isDefused ? ['[4체01-02]', '[4체02-06]'] : ['[4체01-02]'];
  const title = '기본 체력운동 수행 및 팀워크';

  if (level === 'high') {
    return {
      standardCodes,
      standardTitle: title,
      comment: `[4체01-02, 4체02-06] 체력운동의 방법과 원리를 이해하고, 스마트 신체활동 챌린지('${activityName}')에서 뛰어난 순발력과 지구력을 발휘하여 '${groupName}' 모둠 미션을 성공적으로 완수함. 모둠 내에서 서로를 북돋우며 솔선수범하였고 포기하지 않는 끈기가 매우 우수함.`,
    };
  }

  if (level === 'mid') {
    return {
      standardCodes: ['[4체01-02]'],
      standardTitle: '기본 체력운동 성실 수행',
      comment: `[4체01-02] 기본 체력운동의 절차에 따라 '${groupName}' 모둠 신체 챌린지에 적극적으로 참여하며 체력 향상을 위해 성실히 노력함. 모둠원들과의 소통과 협동을 통해 미션을 성실히 완수하고 안전 약속을 모범적으로 실천함.`,
    };
  }

  return {
    standardCodes: ['[4체01-01]'],
    standardTitle: '체력운동 참여 의지와 성장',
    comment: `[4체01-01] 운동과 건강의 중요성을 알고 '${groupName}' 모둠 신체활동에 긍정적인 자세로 참여함. 자신의 신체 능력에 맞추어 단계적으로 운동량을 늘려가며 끝까지 완주하려는 끈기를 보임.`,
  };
}

// 5~6학년군 체육과 성취기준 연계 문구 생성기
function generateGrade56Comment(
  groupName: string,
  level: AchievementLevel,
  domain: DomainKey,
  activityName: string,
  missionsCount: number,
  isDefused: boolean
): { comment: string; standardCodes: string[]; standardTitle: string } {
  if (domain === 'sports') {
    const standardCodes = ['[6체02-05]', '[6체02-10]'];
    const title = '전략형 스포츠 기본 기능 및 스포츠맨십';
    if (level === 'high') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[6체02-05, 6체02-10] 전략형 신체활동의 기본 원리를 정확히 파악하고, '${groupName}' 모둠 대항전에서 효과적인 역할 분담과 전술을 주도하여 팀 승리를 견인함. 경기 중 상황 판단력이 탁월하며 상대 팀의 기술을 인정하고 정정당당하게 승부에 임하는 모범적인 스포츠맨십을 실천함.`,
      };
    }
    if (level === 'mid') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[6체02-05] 전략형 스포츠 게임의 룰을 숙지하고 팀 전술에 맞추어 '${groupName}' 모둠 내 자신의 역할을 성실히 수행함. 모둠원들과 원활하게 소통하며 경기 규칙과 안전 수칙을 준수하고 공정한 태도로 게임에 임함.`,
      };
    }
    return {
      standardCodes: ['[6체02-06]'],
      standardTitle: '게임 기본 전략 이해와 참여',
      comment: `[6체02-06] '${groupName}' 모둠 게임의 기본 전략을 이해하고 팀 활동에 기여하기 위해 지속적으로 노력함. 동료들의 도움을 받아 단계별 미션을 성실히 해결하며 협동 정신을 기름.`,
    };
  }

  if (domain === 'expression') {
    const standardCodes = ['[6체03-04]', '[6체03-05]'];
    const title = '신체 동작 표현 및 창작 협동';
    if (level === 'high') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[6체03-04, 6체03-05] 주제에 부합하는 역동적인 신체 동작을 창의적으로 구성하고 '${groupName}' 모둠원들과 조화로운 움직임을 연출함. 신체 자신감이 높고 표현의 흐름과 공간 활용이 우수하며 타인의 표현을 존중하는 감상 태도를 지님.`,
      };
    }
    if (level === 'mid') {
      return {
        standardCodes,
        standardTitle: title,
        comment: `[6체03-04] 신체 표현의 기본 동작을 바르게 파악하고 리듬과 신호에 맞추어 표현 활동을 성실히 수행함. '${groupName}' 모둠원들과 협력하여 표현 과제를 조화롭게 완수함.`,
      };
    }
    return {
      standardCodes: ['[6체03-03]'],
      standardTitle: '표현 동작 학습과 참여',
      comment: `[6체03-03] 신체 표현의 유형을 이해하고 '${groupName}' 모둠 활동에 성실히 참여함. 반복 연습을 통해 표현 동작에 대한 자신감을 점진적으로 향상시켜 나감.`,
    };
  }

  // 기본/운동/체력 영역
  const standardCodes = isDefused ? ['[6체01-02]', '[6체01-05]'] : ['[6체01-05]'];
  const title = '건강 체력 측정 및 규칙적 운동 실천';

  if (level === 'high') {
    return {
      standardCodes,
      standardTitle: title,
      comment: `[6체01-02, 6체01-05] 자신의 건강 체력과 운동 체력 수준을 올바르게 진단하고, 고난도 신체 미션('${activityName}')에 주도적으로 도전하여 '${groupName}' 모둠의 ${missionsCount}단계 과제를 끈기 있게 완수함. 모둠의 리더로서 팀원들의 사기를 진작시키고 자기관리 역량이 매우 돋보임.`,
    };
  }

  if (level === 'mid') {
    return {
      standardCodes: ['[6체01-05]'],
      standardTitle: '체력 운동 끈기 있는 실천',
      comment: `[6체01-05] '${groupName}' 모둠 체력 챌린지에 성실한 태도로 임하며 정해진 운동 목표를 달성하기 위해 끈기 있게 노력함. 신체활동 과정에서 모둠원들과 긴밀히 소통하고 안전 수칙을 철저히 지키며 모둠 과제를 충실히 완수함.`,
    };
  }

  return {
    standardCodes: ['[6체01-01]'],
    standardTitle: '체력 요소 이해와 규칙적 참여',
    comment: `[6체01-01] 체력 요소의 중요성을 이해하고 체력 향상을 위해 자신의 페이스에 맞게 '${groupName}' 모둠 신체활동에 참여함. 모둠 활동을 통해 지속적인 운동 실천에 대한 관심과 참여 의지를 높여가고 있음.`,
  };
}

// 종합 NEIS 세특 생성기 메인 함수
export function generateNeisGroupComments(
  groups: RoomGroup[],
  gameRoom: GameRoom | null,
  options: NeisGeneratorOptions
): NeisCommentResult[] {
  const sorted = [...groups].sort((a, b) => (b.score || 0) - (a.score || 0));
  const activityName = options.customActivityName || gameRoom?.name || '신체활동 미션 챌린지';

  return sorted.map((group, index) => {
    const rank = index + 1;
    const score = Number.isFinite(group.score) ? group.score : 0;
    const missionsCount = Array.isArray(group.completed_missions)
      ? new Set(group.completed_missions.filter(id => typeof id === 'string')).size
      : 0;
    const isDefused = Boolean(group.is_defused);

    const level = options.forceLevel || evaluateLevel(group, sorted);

    let genResult: { comment: string; standardCodes: string[]; standardTitle: string };

    if (options.gradeGroup === '1~2학년') {
      genResult = generateGrade12Comment(group.group_name, level, options.domain, missionsCount);
    } else if (options.gradeGroup === '3~4학년군') {
      genResult = generateGrade34Comment(group.group_name, level, options.domain, activityName, missionsCount, isDefused);
    } else {
      genResult = generateGrade56Comment(group.group_name, level, options.domain, activityName, missionsCount, isDefused);
    }

    const comment = genResult.comment;
    const charCount = comment.length;
    const byteCount = calculateKoreanByte(comment);

    return {
      groupId: group.id,
      groupName: group.group_name,
      rank,
      score,
      missionsCount,
      isDefused,
      level,
      standardCodes: genResult.standardCodes,
      standardTitle: genResult.standardTitle,
      comment,
      charCount,
      byteCount,
    };
  });
}

// 학급 전체 공통 총평 세특 문구
export function generateClassGeneralComment(
  gameRoom: GameRoom | null,
  groups: RoomGroup[],
  gradeGroup: GradeGroupKey,
  _domain: DomainKey
): { title: string; lines: string[] } {
  const activityName = gameRoom?.name || '스마트 체육 신체활동 챌린지';
  const defusedCount = groups.filter(g => g.is_defused).length;

  let standardPrefix = '';
  if (gradeGroup === '1~2학년') {
    standardPrefix = '2022 개정 즐거운 생활(신체활동) 교육과정 연계: ';
  } else if (gradeGroup === '3~4학년군') {
    standardPrefix = '2022 개정 초등 체육과 [4체01-02, 4체02-06] 성취기준 연계: ';
  } else {
    standardPrefix = '2022 개정 초등 체육과 [6체01-02, 6체02-05] 성취기준 연계: ';
  }

  const lines = [
    `${standardPrefix}학급 전체가 '${activityName}' 협동 신체 챌린지에 주도적으로 참여하여 기초 체력 및 협동 역량을 기름.`,
    `모둠별로 움직임의 원리와 규칙을 이해하고 전략을 상호 공유하여 총 ${groups.length}개 모둠 중 ${defusedCount}개 모둠이 고난도 최종 목표를 완수함.`,
    `승패를 넘어 상호 존중과 배려의 태도로 함께 땀 흘리며 성취감을 나누었으며, 안전 수칙을 철저히 준수하는 모범적인 신체활동 문화를 체득함.`
  ];

  return {
    title: `${gradeGroup} 학급 체육과 세부능력 및 특기사항 공통 총평`,
    lines,
  };
}
