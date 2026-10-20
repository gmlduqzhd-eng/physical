import { useState } from 'react';
export function LocalAiSettings({ onSave }: { onSave: () => void }) {
  const [key, setKey] = useState(''); const [reviewed, setReviewed] = useState(false); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  return <section className="ai-privacy"><h2>이 PC의 AI 키 설정</h2><p>OpenAI에서 새로 발급한 키를 아래 칸에 붙여 넣고 저장하세요. 이 PC의 서버 설정 파일에만 저장하며 GitHub나 브라우저 저장소에는 넣지 않습니다. 실제 운영 사이트에는 별도 설정이 필요합니다.</p>
    <form onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(''); try {
      const response = await fetch('/api/teacher?action=configure-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key.trim(), privacyReviewed: reviewed }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? '저장 실패'); setKey(''); setMessage(reviewed ? '저장했습니다. 아래에서 AI 초안을 만들 수 있습니다.' : '키를 저장했습니다. 학교 이용 절차와 데이터 공유 설정을 확인한 뒤 검토 확인을 체크하고 다시 저장해야 AI를 사용할 수 있습니다.'); onSave();
    } catch (error) { setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.'); } finally { setBusy(false); } }}>
      <label>OpenAI API 키<input type="password" autoComplete="off" spellCheck={false} placeholder="새 키를 여기에 붙여 넣으세요" value={key} onChange={e => setKey(e.target.value)} required minLength={23} maxLength={503} /></label>
      <label className="ai-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />학교의 외부 AI 이용 절차와 OpenAI 데이터 공유 설정을 확인했습니다.</label>
      <button disabled={busy}>{busy ? '저장 중…' : '이 PC에 키 저장'}</button><p role="status">{message}</p>
    </form>
  </section>;
}
