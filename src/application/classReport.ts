import type { RoomGroup } from '../domain/types';

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

export function buildClassReportCsv(groups: RoomGroup[]): string {
  const headers = ['순위', '모둠명', '최종점수', '완료미션수', '해체성공여부', '기록요약과관찰보완'];
  const rows = groups.map((group, index) => [
    `${index + 1}위`, group.group_name, Number.isFinite(group.score) ? group.score : 0,
    Array.isArray(group.completed_missions) ? new Set(group.completed_missions.filter(id => typeof id === 'string')).size : 0,
    group.is_defused ? '성공' : '미완성', recordedGroupComment(group),
  ]);
  return '\uFEFF' + [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}
