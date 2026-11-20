import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// 공용 키오스크: 응답만 끊긴 뒤 다시 눌러도 같은 actionId로 보내 점수가 두 번 들어가지 않는다.
test('kiosk score press reuses one actionId on retry and reports teacher-review scores as pending',()=>{
 const kiosk=readFileSync('src/presentation/KioskRelayView.tsx','utf8');
 assert.match(kiosk,/pendingAction\.current/);
 assert.match(kiosk,/prior\.groupId === selectedGroup\.id && prior\.amount === amount \? prior/);
 assert.match(kiosk,/saveScoreAction\(selectedGroup\.id, amount, action\.id\)/);
 // 다시 시도할 수 있는 실패에서는 actionId를 지우지 않는다.
 assert(kiosk.indexOf("result === 'retry'")<kiosk.indexOf('pendingAction.current = null'));
 assert.match(kiosk,/result === 'pending'/);
 const repo=readFileSync('src/data/scoreRepository.ts','utf8');
 assert(!repo.includes('incrementScore')&&!repo.includes('getScoresByRoomId'));
});
test('unused template and brand images are not shipped in src/assets',()=>{
 for(const f of ['brand-logo.png','react.svg','vite.svg','hero.png'])assert.throws(()=>readFileSync('src/assets/'+f));
});
