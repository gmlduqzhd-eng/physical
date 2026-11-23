import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Smartphone, Monitor, Users, User, ShieldCheck, Timer, FileText } from 'lucide-react';
import { AVAILABLE_GAMES as GAMES } from '../domain/gamesData';
import { CORE_ACTIVITIES } from '../domain/activityShelves';
import { FLAGSHIP_SAFETY } from '../domain/flagship';
import { LessonPlanGeneratorV2 } from './components/LessonPlanGeneratorV2';
import { FlowShell } from './FlowShell';
import './ActivityLibrary.css';
import './Manual.css';

/** 영역별 대표 활동은 지금 쓰는 핵심 활동 목록에서 가져온다. 활동이 바뀌어도 설명서가 따라간다. */
const representatives = (domain: string, count = 4) => CORE_ACTIVITIES.filter(game => game.domain === domain).slice(0, count);
const GRADE_BANDS = [['1~2학년', '1~2학년군'], ['3~4학년군', '3~4학년군'], ['5~6학년군', '5~6학년군']] as const;

export const Manual = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'manual' | 'lesson'>(searchParams.get('tab') === 'lesson' ? 'lesson' : 'manual');

  return (
    <FlowShell utilities className="manual-page">
      <div className="manual-content space-y-6 relative">
        <section className="manual-intro"><p className="eyebrow">땀방울 원정대 사용 안내</p><h1>이용 안내</h1><p className="muted">수업 준비부터 학생 참여까지, 필요한 내용을 차근차근 살펴보세요.</p></section>
        <aside className="manual-ai-link" aria-label="처음 쓰는 선생님 안내"><div><strong>처음 쓰는 선생님</strong><p>TV에 띄우기 → 휴대폰 리모컨 연결 → 시작·다음·점수, 1분이면 돼요.</p></div><Link className="primary" to="/guide">처음 쓰는 선생님 1분 안내 다시 보기</Link></aside>
        <aside className="manual-ai-link" aria-label="AI 수업 준비 안내"><div><strong>AI로 수업을 준비하고 싶다면</strong><p>기존 지도안 생성기는 조건과 문구를 조합하는 일반 도구입니다. 생성형 AI는 별도의 수업 준비실에서 사용합니다.</p></div><button className="primary" onClick={() => navigate('/teacher-ai')}>✦ 수업 준비실 열기</button></aside>
        <nav className="manual-tabs" aria-label="안내 화면 선택"><button aria-pressed={activeTab === 'manual'} onClick={() => setActiveTab('manual')}><Sparkles aria-hidden="true"/>사용 설명서</button><button aria-pressed={activeTab === 'lesson'} onClick={() => setActiveTab('lesson')}><FileText aria-hidden="true"/>수업 지도안 생성기</button></nav>
        {/* 사용 설명서 탭 */}
        {activeTab === 'manual' && (
        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-10">
          
          {/* 타이틀 및 개요 */}
          <div className="text-center pb-6 border-b border-slate-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-sm font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> 2022 개정 초등 체육과 교육과정 연계
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              총 {GAMES.length}종 스마트 체육 활동 &amp; 교실 수업 완전 정복 가이드
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed" style={{marginInline:'auto',textWrap:'balance'}}>
              화면 안내를 보고 교실·강당에서 실제 공과 도구로 온몸을 움직이는 활동, 준비물 없는 신체 놀이, 그리고 유튜브 영상 연계 댄스·표현 활동까지!
              학생들의 신체활동 역량과 협동심을 기를 수 있도록 설계된 학교 체육 수업 플랫폼입니다.
            </p>
          </div>

          {/* 1. 2022 개정 교육과정 3대 영역 및 성취기준 체계 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">1</span>
              2022 개정 체육과 3대 영역 (총 {GAMES.length}종 게임)
            </h3>
            <p className="text-sm sm:text-sm text-slate-300 leading-relaxed">
              2022 개정 교육과정 기준에 맞추어 <strong className="text-emerald-400">운동 ({GAMES.filter(game => game.domain === '운동').length}종)</strong>, <strong className="text-blue-400">스포츠 ({GAMES.filter(game => game.domain === '스포츠').length}종)</strong>, <strong className="text-purple-400">표현 ({GAMES.filter(game => game.domain === '표현').length}종)</strong>의 3개 대영역으로 체계적으로 분류되어 있으며, 모든 활동 카드에서 학년군별 성취기준 코드와 세부 목표를 열람할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/30">
                <div className="font-black text-emerald-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">🏃 운동 영역</span>
                  <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">{GAMES.filter(game => game.domain === '운동').length}종</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  자신의 체력 수준을 이해하고 건강 체력(근력, 유연성, 심폐지구력) 및 운동 체력(순발력, 민첩성, 평형성)을 기르는 활동
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  대표: {representatives('운동').map(game => game.name).join(', ')} 등
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-blue-500/30">
                <div className="font-black text-blue-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">⚽ 스포츠 영역</span>
                  <span className="text-sm px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">{GAMES.filter(game => game.domain === '스포츠').length}종</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  기술형(표적·기록·투기), 전략형(영역·필드·네트), 생태형(민속·놀이) 스포츠 기능과 공간 전술, 규칙과 협동심 실천
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  대표: {representatives('스포츠').map(game => game.name).join(', ')} 등
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-purple-500/30">
                <div className="font-black text-purple-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">🎭 표현 영역</span>
                  <span className="text-sm px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">{GAMES.filter(game => game.domain === '표현').length}종</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  신체 움직임을 통해 생각과 정서를 창의적으로 나타내고, 유튜브 영상 연계 댄스·탈춤·치어리딩 및 심미적 가치를 감상하는 활동
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  대표: {representatives('표현').map(game => game.name).join(', ')} 등
                </div>
              </div>
            </div>
          </section>

          {/* 2. 기기 및 활동 형태별 분류 필터 안내 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">2</span>
              스마트 기기 지원 &amp; 개인/협동 활동 분류
            </h3>
            <p className="text-sm sm:text-sm text-slate-300 leading-relaxed">
              학교 교실과 체육관의 다양한 ICT 인프라(학생 스마트폰, 학교 태블릿 PC, 교탁 데스크톱 PC 등)에 맞춰 수업에 활용할 수 있도록 필터를 지원합니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 기기 분류 */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> 지원 기기별 안내
                </h4>
                <ul className="text-sm text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-white">📱 스마트폰 ({GAMES.filter(game => game.devices.includes('스마트폰')).length}종):</strong> 화면·소리·센서 등을 활용합니다. 활동별 안내에 따라 기기를 안전하게 내려놓거나 거치하고 참여하세요.
                  </li>
                  <li>
                    <strong className="text-white">📟 태블릿 PC ({GAMES.filter(game => game.devices.includes('태블릿 PC')).length}종):</strong> 넓은 화면으로 활동 안내를 함께 보고, 터치·드래그 등 활동별 조작 방법으로 참여합니다.
                  </li>
                  <li>
                    <strong className="text-white">🖥️ 데스크톱 PC ({GAMES.filter(game => game.devices.includes('데스크톱 PC')).length}종):</strong> 마우스·키보드 등 화면에 안내된 방법으로 참여합니다. 센서가 없는 기기에서는 활동별 대체 조작 안내를 확인하세요.
                  </li>
                </ul>
              </div>

              {/* 활동 형태 */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 활동 형태별 안내
                </h4>
                <ul className="text-sm text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-white"><User className="inline w-3.5 h-3.5 mr-1 text-slate-400" />개인 게임 ({GAMES.filter(game => game.playMode === '개인').length}종):</strong> 움직임·반응·균형 등 나에게 맞는 목표로 참여하는 도전 과제
                  </li>
                  <li>
                    <strong className="text-white"><Users className="inline w-3.5 h-3.5 mr-1 text-amber-400" />협동 게임 ({GAMES.filter(game => game.playMode === '협동').length}종):</strong> 짝 또는 모둠이 함께 움직이고 역할을 바꾸며 소통하는 활동
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 3초 카운트다운과 기기 상관없는 진행 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">3</span>
              수업 최적화: 3초 카운트다운 &amp; 기기 상관없이 같은 방법
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> 경쾌한 3초 준비 카운트다운
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  기존의 긴 대기시간(5초)을 <strong>3초</strong>로 단축하여 학생들의 집중력이 흐트러지지 않고 경쾌하게 실제 신체활동으로 바로 진입할 수 있도록 개선하였습니다.
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-teal-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> 센서 없이도 같은 활동
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  지금 활동은 기기 센서로 움직임을 재지 않아요. 화면 안내를 보고 몸으로 움직인 뒤, 완료는 학생이나 선생님이 버튼으로 확인해요. 그래서 스마트폰·태블릿·PC 어디서나 같은 방법으로 쓸 수 있어요.
                </p>
              </div>
            </div>
          </section>

          {/* 4. 영역별 대표 활동 — 지금 쓰는 핵심 활동에서 자동으로 만든다 */}
          <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">4</span>
              <h3 className="text-lg sm:text-xl font-black text-white">🏃 영역별 대표 활동 수업 팁</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              수업에 바로 쓰기 좋은 핵심 활동 {CORE_ACTIVITIES.length}개 가운데 영역마다 몇 가지를 골라 보여 줘요. 전체 목록과 준비물·안전 안내는 활동 고르기에서 확인해요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {(['운동', '스포츠', '표현'] as const).flatMap(domain => representatives(domain, 3)).map(game => (
                <div key={game.type} className="p-3.5 bg-slate-900 rounded-xl border border-emerald-500/20 space-y-1">
                  <div className="font-black text-emerald-400 flex items-center gap-1.5"><span aria-hidden="true">{game.emoji}</span> {game.name} ({game.domain})</div>
                  <p className="text-slate-300 leading-relaxed">{game.desc}</p>
                </div>
              ))}
            </div>
            <button type="button" className="text-sm font-bold text-cyan-300 underline" onClick={() => navigate('/hub')}>활동 전체 둘러보기 →</button>
          </section>

          {/* 5. 표현 활동과 유튜브 영상 연계 수업 */}
          <section className="bg-slate-950 p-6 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold border border-purple-500/30">5</span>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>🎭</span> 표현 활동 {GAMES.filter(game => game.domain === '표현').length}종 &amp; 유튜브 영상 연계 수업
              </h3>
            </div>

            <p className="text-sm sm:text-sm text-slate-300 leading-relaxed">
              표현 영역 활동은 학년군마다 고를 수 있어요. 특히 K-POP 안무, 전통 탈춤, 세계 민속 춤, 치어리딩, 음악 줄넘기, 태보 등은 <strong>유튜브 시연 영상을 직접 보며</strong> 따라 할 수 있습니다.
            </p>

            {/* 유튜브 플레이어 기능 안내 카드 */}
            <div className="bg-purple-950/30 p-4 sm:p-5 rounded-2xl border border-purple-500/30 space-y-3">
              <h4 className="text-sm font-black text-purple-300 flex items-center gap-2">
                <span>📺</span> 영상 연계 플레이어 핵심 기능
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-500/20">
                  <div className="font-bold text-white mb-1">🪞 거울 모드 (좌우 반전)</div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    강사의 왼손/오른손이 거울처럼 마주 보여 학생들이 헷갈리지 않고 쉽게 동작을 따라 합니다.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-500/20">
                  <div className="font-bold text-white mb-1">🔗 맞춤 영상 URL 변경</div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    선생님이 수업에 사용할 유튜브 링크(URL)를 직접 붙여넣어 원하는 교육 영상으로 즉시 교체 가능합니다.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-500/20">
                  <div className="font-bold text-white mb-1">🎵 비트 메트로놈</div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    8박자(1-2-3-4 / 5-6-7-8) 시각·청각 가이드를 통해 음악의 빠르기와 강약을 체득합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 학년군별 표현 활동 — 지금 쓰는 활동에서 자동으로 만든다 */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-200">📚 학년군별 표현 활동</h4>
              {GRADE_BANDS.map(([grade, label]) => {
                const list = GAMES.filter(game => game.domain === '표현' && game.grades.includes(grade));
                return (
                  <div key={grade} className="p-3.5 bg-slate-900 rounded-xl border border-purple-500/20 text-sm space-y-1">
                    <div className="font-black text-purple-300">{label} · {list.length}종</div>
                    <p className="text-slate-300 leading-relaxed">{list.slice(0, 10).map(game => `${game.emoji} ${game.name}`).join(' · ')}{list.length > 10 ? ' 외' : ''}</p>
                    <button type="button" className="font-bold text-cyan-300 underline" onClick={() => navigate(`/hub?domain=${encodeURIComponent('표현')}&grade=${encodeURIComponent(grade)}`)}>{label} 표현 활동 모두 보기 →</button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. 안전 및 수업 운영 수칙 */}
          <section className="bg-amber-950/30 p-5 sm:p-6 rounded-2xl border border-amber-500/30 space-y-3">
            <h3 className="text-amber-400 font-black flex items-center gap-2 text-sm sm:text-base">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> 교사 및 학생 필수 안전 수칙
            </h3>
            <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-disc list-inside">
              {FLAGSHIP_SAFETY.map(rule => <li key={rule}>{rule}</li>)}
              <li><strong className="text-amber-300">무리한 신체 접촉 금지:</strong> 짝·모둠 활동에서 친구의 몸을 강제로 잡아당기지 않고 신호와 구령으로 협력해요.</li>
              <li><strong className="text-amber-300">몸의 변화 관찰:</strong> 맥박은 손목에서 가볍게 느끼고 목은 누르지 않아요. 숫자를 재거나 친구와 비교하지 않아요. 숨은 참지 않아요.</li>
              <li><strong className="text-amber-300">공간:</strong> 거리는 한 가지 숫자로 정하지 않고, 교실 크기와 활동에 맞춰 팔을 뻗어도 닿지 않는 개인 공간을 먼저 확인해요.</li>
            </ul>
          </section>

          {/* 7. 별명과 개인 활동 기록 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">7</span>
              🏆 별명과 내 활동 기록
            </h3>
            <p className="text-sm sm:text-sm text-slate-300 leading-relaxed">
              개인 게임 결과는 현재 탭에서 임시로 확인할 수 있습니다. 별명과 개인 활동 기록은 이 탭의 세션 저장소에 최대 8시간 보관하며, 다음 접근 때 만료된 정보를 삭제합니다. 장기 저장하거나 다른 기기로 동기화하는 기록은 아닙니다.
            </p>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-white">✏️ 닉네임 설정:</strong> 개인 활동 기록을 사용할 때는 실명이나 학번 대신 개인을 알아볼 수 없는 별명을 사용하세요. (예: "튼튼구름")
                </li>
                <li>
                  <strong className="text-white">📊 내 활동 기록:</strong> 완료한 개인 게임의 점수와 참여 횟수 등을 확인할 수 있습니다. 이 기록은 학생의 신체 능력을 진단하거나 비교하는 자료가 아닙니다.
                </li>
                <li>
                  <strong className="text-white">수업 참여 정보:</strong> 수업방 입장에 쓰는 번호와 별명은 수업방 명단에도 저장됩니다. 서버 명단과 기기 저장 정보는 보관 방식이 다르므로 개인정보 안내를 확인하세요.
                </li>
                <li>
                  <strong className="text-white">공용 기기 정리:</strong> 수업이 끝나면 <button className="underline" onClick={() => navigate('/privacy')}>개인정보 안내</button>에서 ‘기기 정보 지우기 및 로그아웃’을 눌러 정리하세요. 이 버튼은 진행 중인 수업의 서버 명단까지 삭제하지는 않습니다.
                </li>
              </ul>
            </div>
          </section>

          {/* 8. 라이트/다크 모드 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">8</span>
              상단 이용 설정
            </h3>
            <p className="text-sm sm:text-sm text-slate-300 leading-relaxed">
              화면 위쪽의 음악·링크 공유·앱 설치 버튼으로 이용 환경을 설정할 수 있습니다.
            </p>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-white">음악:</strong> 배경음악을 켜거나 끄고 음량을 조절합니다.
                </li>
                <li>
                  <strong className="text-white">링크 공유:</strong> 앱의 처음 화면 링크를 공유합니다. 수업방 참여 QR과는 별도입니다.
                </li>
                <li>
                  <strong className="text-white">앱 설치:</strong> 지원되는 브라우저에서는 설치를 요청하고, 그 외에는 기기별 추가 방법을 안내합니다.
                </li>
              </ul>
            </div>
          </section>

          {/* #10 AI 수업 지도안 생성기 — 별도 탭으로 이동 */}

          {/* 하단 푸터 안내 */}
          <div className="pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-400 text-sm font-medium">
              땀방울 원정대 ⓒ2026. 엽쌤 All rights reserved.
            </p>
          </div>

        </div>
        )}

        {/* 수업 지도안 생성기 탭 */}
        {activeTab === 'lesson' && (
        <div className="bg-slate-900/90 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center pb-4 border-b border-slate-800">
            <h2 className="text-xl sm:text-2xl font-black text-white">📝 수업 지도안 생성기</h2>
            <p className="text-sm text-slate-400 mt-2">2022 개정 교육과정 연계 · 땀방울 원정대 게임 활용 · 실전형 수업 설계</p>
            <p className="text-sm text-slate-500 mt-1">학년군·영역·조건을 입력하면 교육과정 연계 수업 지도안을 자동으로 생성합니다.</p>
          </div>
          <LessonPlanGeneratorV2 />
        </div>
        )}

      </div>
    </FlowShell>
  );
};
