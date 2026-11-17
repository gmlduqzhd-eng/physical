/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {BOSSES,BOSS_TOTAL_HP,SPECIAL_DAMAGE,bossDamage,bossStatus} from '../../../../../domain/signature/sig-boss-raid';
import {comboFull} from '../../../../../domain/funLoop';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';

/** 보스 카드: 지금 보스, HP 막대, 물리친 보스. 연습 판에는 허수아비가 나온다. */
function BossPanel({state}:SignatureModuleProps){
 if(state.phase==='tutorial')return <div className="sig-boss" data-practice><span className="sig-boss-emoji" aria-hidden="true">🎯</span><div><b>허수아비(연습)</b><p>연습 판에서 공격 버튼을 눌러 보세요. 본게임에서 0부터 다시 시작해요.</p></div></div>;
 const st=bossStatus(state),pct=Math.round(st.hpLeft/st.boss.hp*100);
 return <div className="sig-boss" data-done={st.done||undefined}>
  <span className="sig-boss-emoji" aria-hidden="true">{st.done?'🏆':st.boss.emoji}</span>
  <div className="sig-boss-body">
   <b>{st.done?'보스를 모두 물리쳤어요!':`보스 ${st.index+1}/${BOSSES.length} · ${st.boss.name}`}</b>
   <div className="sig-hp" role="meter" aria-label={`${st.boss.name} HP`} aria-valuemin={0} aria-valuemax={st.boss.hp} aria-valuenow={st.hpLeft}><i style={{width:`${st.done?0:pct}%`}}/></div>
   <span>HP {st.hpLeft}/{st.boss.hp}{state.phase==='climax'?' · 총공격! 피해 2배':''}</span>
  </div>
  <ol className="sig-boss-list" aria-label="보스 셋">{BOSSES.map((b,i)=><li key={b.id} data-state={i<st.defeated?'done':i===st.index&&!st.done?'now':undefined}><span aria-hidden="true">{b.emoji}</span>{i<st.defeated?'✔':''}</li>)}</ol>
 </div>;
}
function BossResult({state}:SignatureModuleProps){
 const st=bossStatus(state);
 return <p className="sig-boss-result">총 피해 {Math.min(bossDamage(state),BOSS_TOTAL_HP)}/{BOSS_TOTAL_HP} · 물리친 보스 {st.defeated}/{BOSSES.length}{state.specials?` · 필살기 ${state.specials}번`:''}</p>;
}
const bossRaidModule:SignatureModule={
 Panel:BossPanel,Result:BossResult,
 controls:({state})=>[{label:`💥 필살기(피해 ${SPECIAL_DAMAGE})`,command:{type:'special'},disabled:!comboFull(state)||state.phase==='tutorial',hint:'S',tone:'gold'}],
};
export default bossRaidModule;
