import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const TEACHER_CSS = [
  'src/presentation/LessonShell.css', 'src/presentation/TodayLesson.css', 'src/presentation/GuidedClassroom.css',
  'src/presentation/ClassTools.css', 'src/presentation/Manual.css', 'src/presentation/TeacherAi.css',
  'src/presentation/SimpleFlow.css', 'src/presentation/ClassroomSetup.css', 'src/presentation/components/admin/QRCodePanel.css',
  'src/presentation/components/TeacherAccountForm.css', 'src/presentation/components/TeacherAuthGuard.css',
  'src/presentation/components/TeacherQuickGuide.css', 'src/presentation/components/TeacherRoomGuide.css',
  'src/presentation/components/HeaderUtilities.css',
];

test('teacher screens: no px font-size below 14 outside print rules', () => {
  for (const file of TEACHER_CSS) {
    const css = read(file).replace(/@media print\{[^@]*?\}\}/g, '');
    const tiny = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(m => Number(m[1]) < 14);
    assert.equal(tiny.length, 0, `${file}: ${tiny.map(m => m[0]).join(', ')}`);
  }
});

test('teacher primary buttons use the unified action token (no amber/teal primaries)', () => {
  const today = read('src/presentation/TodayLesson.css');
  assert.match(today, /\.today-primary[^{]*\{[^}]*background:var\(--ui-action/);
  assert.doesNotMatch(today, /\.today-primary[^{]*\{[^}]*#f59e0b/);
  assert.match(read('src/presentation/components/TeacherQuickGuide.css'), /\.tqg-primary\{[^}]*var\(--ui-action/);
  assert.match(read('src/presentation/SimpleFlow.css'), /\.flow \.primary\{background:var\(--ui-action/);
  assert.doesNotMatch(read('src/presentation/components/admin/QRCodePanel.css'), /#08787a/);
});

test('destructive teacher actions use the danger button style', () => {
  assert.match(read('src/presentation/SimpleFlow.css'), /\.ui-btn--danger/);
  const ops = read('src/presentation/ClassroomOperations.tsx');
  assert.match(ops, /className="ui-btn ui-btn--danger"[\s\S]{0,200}?>이 수업 즉시 삭제/);
  assert.match(ops, /className="ui-btn ui-btn--danger"[\s\S]{0,600}?>삭제 확정</);
  assert.match(read('src/presentation/GuidedClassroomControl.tsx'), /className="ui-btn ui-btn--danger" onClick=\{\(\) => setConfirmEnd\(true\)\}>수업 종료하기/);
  assert.match(read('src/presentation/ClassTools.tsx'), /className="ui-btn ui-btn--danger"[\s\S]{0,200}?>기록 지우기/);
});

test('Tailwind teacher panels: no cool-colour filled buttons or tiny text classes left', () => {
  for (const file of ['src/presentation/AdminControlPanel.tsx', 'src/presentation/Manual.tsx', 'src/presentation/components/LessonPlanGeneratorV2.tsx', 'src/presentation/components/ClassReportModal.tsx', 'src/presentation/components/admin/QuickStart.tsx']) {
    const src = read(file);
    assert.doesNotMatch(src, /(?<![\w:-])bg-(?:cyan|indigo|purple|emerald|blue|teal|violet|sky|green)-(?:500|600|700)(?![\w/\-[])/, file);
    assert.doesNotMatch(src, /(?<![\w:-])text-(?:xs|\[(?:9|10|11|12|13)px\])(?![\w/\-[])/, file);
  }
});
