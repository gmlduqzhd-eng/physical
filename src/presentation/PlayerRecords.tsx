import {Link,useSearchParams} from 'react-router-dom';
import {usePlayerProfile} from '../application/usePlayerProfile';
import {FlowShell} from './FlowShell';
import {RecentGameRecords} from './components/RecentGameRecords';
import './ActivityLibrary.css';
export function PlayerRecords(){
 const {profile}=usePlayerProfile();
 const [params]=useSearchParams(),candidate=params.get('returnTo');
 const groupReturn=candidate&&/^\/mobile\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(candidate)?candidate:null;
 return <FlowShell utilities back={groupReturn||'/solo'} backLabel={groupReturn?'모둠으로':'활동 목록으로'}><h1>내 활동 기록</h1><p>{profile?.nickname||'원정대원'}의 활동 결과를 확인해요.</p><div className="notice">완료 {profile?.totalPlays||0}회 · 누적 {(profile?.totalScore||0).toLocaleString()}점</div><RecentGameRecords profile={profile}/><nav className="row" aria-label="다음 활동" style={{marginTop:24}}><Link className="primary" to={groupReturn||'/solo'}>{groupReturn?'모둠으로 돌아가기':'다른 활동 찾기'}</Link><Link className="secondary" to="/hub/tools?tab=records">별명·배지 보기</Link></nav></FlowShell>;
}
