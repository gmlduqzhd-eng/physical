import type { RoomGroup, GameRoom } from '../domain/types';
import { 
  generateNeisGroupComments, 
  generateClassGeneralComment,
  type GradeGroupKey,
  type DomainKey
} from './neisGenerator';

export function escapeCsvCell(value: unknown): string {
  let text = typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value ?? '');
  // A quoted CSV cell can still be evaluated as a spreadsheet formula.
  if (typeof value !== 'number' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function recordedGroupComment(group: RoomGroup): string {
  const score = Number.isFinite(group.score) ? group.score : 0;
  const missions = Array.isArray(group.completed_missions)
    ? new Set(group.completed_missions.filter(id => typeof id === 'string')).size : 0;
  return `'${group.group_name}' 모둠은 최종 ${score.toLocaleString('ko-KR')}점과 미션 ${missions}개 완료가 기록됨. 최종 해체 ${group.is_defused ? '성공' : '미완료'} 상태임. 학생별 활동 과정과 역할은 교사 관찰 기록으로 보완할 수 있음.`;
}

export interface ClassReportCsvOptions {
  gradeGroup?: GradeGroupKey;
  domain?: DomainKey;
  gameRoom?: GameRoom | null;
}

export function buildClassReportCsv(groups: RoomGroup[], options?: ClassReportCsvOptions): string {
  const gradeGroup = options?.gradeGroup || '3~4학년군';
  const domain = options?.domain || 'all';
  const gameRoom = options?.gameRoom || null;

  const neisList = generateNeisGroupComments(groups, gameRoom, {
    gradeGroup,
    domain,
  });

  const headers = [
    '순위',
    '모둠명',
    '최종점수',
    '완료미션수',
    '해체성공여부',
    '성취수준',
    '2022성취기준코드',
    '성취기준영역',
    'NEIS_체육_세특_평가문구',
    '글자수',
    '바이트수'
  ];

  const rows = neisList.map((item) => [
    `${item.rank}위`,
    item.groupName,
    item.score,
    item.missionsCount,
    item.isDefused ? '성공' : '미완료',
    item.level === 'high' ? '상(우수)' : item.level === 'mid' ? '중(보통)' : '하(노력요함)',
    item.standardCodes.join(', '),
    item.standardTitle,
    item.comment,
    item.charCount,
    item.byteCount,
  ]);

  return '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function buildComprehensiveReportText(
  room: GameRoom,
  groups: RoomGroup[],
  gradeGroup: GradeGroupKey = '3~4학년군',
  domain: DomainKey = 'all'
): string {
  const sorted = [...groups].sort((a, b) => (b.score || 0) - (a.score || 0));
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const generalNeis = generateClassGeneralComment(room, groups, gradeGroup, domain);
  const neisItems = generateNeisGroupComments(groups, room, { gradeGroup, domain });

  let out = `==========================================================\n`;
  out += `📋 땀방울 원정대 2022 개정 체육과 수업 리포트 & NEIS 세특\n`;
  out += `==========================================================\n`;
  out += `📅 수업 일시: ${dateStr}\n`;
  out += `🏫 수업/방 이름: ${room.name}\n`;
  out += `🔑 핀 번호: ${room.pin_code}\n`;
  out += `🎯 적용 교육과정: 2022 개정 초등 체육과 (${gradeGroup})\n\n`;

  out += `[1] 🏆 명예의 전당 및 최종 순위\n`;
  out += `----------------------------------------------------------\n`;
  sorted.forEach((g, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`;
    const missions = g.completed_missions?.length || 0;
    out += `${medal} ${g.group_name} : ${g.score.toLocaleString()}점 (미션 ${missions}회 완료, ${g.is_defused ? '해체 성공' : '도전 완료'})\n`;
  });

  out += `\n[2] 📝 NEIS 세부능력 및 특기사항 (학급 공통 총평)\n`;
  out += `----------------------------------------------------------\n`;
  generalNeis.lines.forEach(l => {
    out += `• ${l}\n`;
  });

  out += `\n[3] 🌟 모둠별 NEIS 체육 세특 평가 문구 (원클릭 입력용)\n`;
  out += `----------------------------------------------------------\n`;
  neisItems.forEach(item => {
    out += `\n▶ [${item.rank}위] ${item.groupName} (점수: ${item.score.toLocaleString()}점 / 성취수준: ${item.level === 'high' ? '상' : item.level === 'mid' ? '중' : '하'})\n`;
    out += `성취기준: ${item.standardCodes.join(', ')} (${item.standardTitle})\n`;
    out += `문구 (${item.charCount}자 / ${item.byteCount}바이트):\n`;
    out += `${item.comment}\n`;
  });

  out += `\n==========================================================\n`;
  out += `© 땀방울 원정대 - 2022 개정 초등 체육과 교육과정 성취기준 연계\n`;

  return out;
}
