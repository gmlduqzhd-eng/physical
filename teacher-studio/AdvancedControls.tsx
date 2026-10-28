import { useState } from 'react';
import { OBSERVATIONS } from '../src/domain/teacherAi';
import { adoptLocalChallenge, reviewLocalChallenge, type ChallengeReview } from './localChallenge';
import type { StudioForm } from './Studio';
export function AdvancedControls({ form, change }: { form: StudioForm; change: (patch: Partial<StudioForm>) => void }) {
  const [notes, setNotes] = useState('');
  return <>
    {form.task === 'mission' && <label>협동 활동 시간 (분)<input type="number" min={1} max={30} value={form.activityMinutes} onChange={e => change({ activityMinutes: Number(e.target.value) })}/></label>}
    {form.task === 'alternative' && <label>날씨 제약<select value={form.weather} onChange={e => change({ weather: e.target.value as StudioForm['weather'] })}>{['제약 없음', '비로 실내 전환', '더위로 실내 전환', '추위로 실내 전환'].map(v => <option key={v}>{v}</option>)}</select><p>날씨 제약이 있으면 사용할 실내 장소도 선택하세요.</p></label>}
    {form.task === 'observation' && <fieldset><legend>관찰 메모에서 일반 항목 선택</legend><label>메모 (전송·저장 안 함)<textarea value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} placeholder="실명·번호·민감정보 금지. 원문은 외부 전송하지 않습니다."/></label><button onClick={() => setNotes('')}>메모 지우기</button><p>메모를 참고하여 아래 일반 태그를 직접 선택하세요. 관찰 요약은 선택 태그를 그대로 확인하는 항목이며, 다음 차시 지도 아이디어를 AI가 생성합니다. 원문 전체 AI 요약이 아닙니다.</p>{OBSERVATIONS.map(tag => <label key={tag} className="ai-check"><input type="checkbox" checked={form.observations.includes(tag)} onChange={e => change({ observations: e.target.checked ? [...form.observations, tag] : form.observations.filter(v => v !== tag) })}/>{tag}</label>)}</fieldset>}
    {form.task === 'group' && <fieldset><legend>개인 식별 정보 없는 범주 집계</legend><p>요약은 입력 범주 그대로 표시하고 활동 조정안을 AI가 생성합니다. 3모둠 이상·모둠당 5명 이상만 허용합니다. 학교·학급·모둠 이름, 정확한 점수·인원, 개인별 결과는 입력하지 않습니다. 집단 구성이나 맥락으로 개인을 추정할 수 있다면 사용하지 마세요.</p><label className="ai-check"><input type="checkbox" checked={form.aggregate !== null} onChange={e => change({ aggregate: e.target.checked ? { groups: '3~5모둠', participants: '모둠당 5~8명', completion: '절반 정도 완료', cooperation: '관찰 부족' } : null })}/>충분히 큰 집단의 비식별·비기밀 요약임을 교사가 확인했습니다.</label>{form.aggregate && (['groups','participants','completion','cooperation'] as const).map((field, i) => <label key={field}>{['모둠 수 범주','모둠별 인원 범주','완료 정도','협동 관찰'][i]}<select value={form.aggregate![field]} onChange={e => change({ aggregate: { ...form.aggregate!, [field]: e.target.value } })}>{[['3~5모둠','6모둠 이상'],['모둠당 5~8명','모둠당 9명 이상'],['대부분 완료','절반 정도 완료','대부분 미완료'],['고른 참여','일부 편중','관찰 부족']][i].map(v => <option key={v}>{v}</option>)}</select></label>)}</fieldset>}
  </>;
}
export function LocalChallenge({ activityId }: { activityId: string }) {
  const [rows, setRows] = useState([{ score: '', rpe: '' }, { score: '', rpe: '' }, { score: '', rpe: '' }]);
  const [confirmed, setConfirmed] = useState(false);
  const [review, setReview] = useState<ChallengeReview>({ kind: 'empty' });
  const clear = () => { setRows([{score:'',rpe:''},{score:'',rpe:''},{score:'',rpe:''}]); setConfirmed(false); setReview({ kind: 'empty' }); };
  const changeRow = (index: number, field: 'score' | 'rpe', value: string) => {
    setRows(previous => previous.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setReview({ kind: 'empty' });
  };
  return <fieldset><legend>6. 다음 도전 · 외부 전송 없는 규칙 분석</legend>
    <p>AI 생성 기능이 아닙니다. 별명·번호도 개인 이력과 연결될 수 있어 입력받지 않습니다. 교사가 같은 학생·같은 활동의 최근 3회 기록인지 직접 확인하고 숫자만 입력합니다. 공용 기기의 기존 기록을 자동으로 읽지 않습니다. 입력은 새로고침·활동 변경·지우기 때 사라집니다.</p>
    {rows.map((row, i) => <div className="ai-fields" key={i}>
      <label>{i+1}번째 기록 점수 ({i===0?'가장 최근':i===1?'직전':'가장 이전'})<input type="number" min={0} max={1000000} value={row.score} onChange={e => changeRow(i, 'score', e.target.value)}/></label>
      <label>운동 자각도 (1~5)<input type="number" min={1} max={5} value={row.rpe} onChange={e => changeRow(i, 'rpe', e.target.value)}/></label>
    </div>)}
    <label className="ai-check"><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setReview({ kind: 'empty' }); }}/>다른 학생의 기록이 섞이지 않았고, 점수가 높을수록 성취가 높은 같은 활동·같은 척도임을 확인했습니다.</label>
    <button disabled={!confirmed} onClick={() => setReview(reviewLocalChallenge(rows, activityId))}>기기 안에서 다음 수준 검토</button>
    <button onClick={clear}>기록과 결과 지우기</button>
    {review.kind === 'invalid' && <p className="ai-error" role="alert">{review.error}</p>}
    {review.kind === 'ready' && <>
      <label>교사 검토·수정<textarea value={review.text} onChange={e => setReview({ kind: 'ready', text: e.target.value, adopted: false })}/></label>
      <button disabled={!review.text.trim()} onClick={() => setReview(adoptLocalChallenge)}>교사 판단으로 채택</button>
      {review.adopted && <p role="status">교사가 검토한 제안으로만 표시합니다. 학생 평가·자동 승급·DB 저장은 하지 않습니다.</p>}
    </>}
  </fieldset>;
}
