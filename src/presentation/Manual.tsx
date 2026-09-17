
import { useNavigate } from 'react-router-dom';
import { Waves, Home } from 'lucide-react';

export const Manual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 p-4 md:p-10 font-sans pb-20 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 sticky top-0 bg-slate-50/90 backdrop-blur-md py-4">
          <h1 className="text-2xl sm:text-3xl font-black text-cyan-600 flex items-center gap-2">
            <span className="text-3xl">📖</span> 땀방울 원정대 사용 설명서
          </h1>
          <button onClick={() => navigate('/')} className="shrink-0 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <Home className="w-4 h-4"/> 홈으로 돌아가기
          </button>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-10">
          <div className="text-center pb-6 border-b border-slate-100">
            <p className="text-lg text-slate-600 font-bold">2022 개정 초등 체육과 교육과정 연계 스마트 수업 플랫폼!</p>
            <p className="text-sm text-slate-500 mt-2">단순한 체력 측정을 넘어, 교육과정 3대 영역(운동·스포츠·표현) 및 성취기준을 기반으로 설계된 게임형 체육 수업 가이드입니다.</p>
          </div>

          {/* 2022 개정 교육과정 연계 안내 배너 */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-2xl border border-cyan-200">
            <h3 className="text-lg font-black text-cyan-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎓</span> 2022 개정 체육과 교육과정 영역 및 수업 연계
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              2022 개정 교육과정(교육부 고시 제2022-33호)에 따라 기존 5개 영역에서 <strong>운동, 스포츠, 표현</strong>의 3개 대영역으로 개편되었습니다. 모든 게임은 학년군별 성취기준 코드와 직접 매핑되어 수업 설계 및 과정 중심 평가에 활용할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
                <div className="font-black text-emerald-700 mb-1 flex items-center gap-1.5">
                  <span>🏃</span> 운동 영역
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  자신의 몸과 체력 수준을 이해하고 생활 속 규칙적인 운동 실천 (건강 체력, 운동 체력, 성장·발달, 생활 습관, 안전)
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm">
                <div className="font-black text-blue-700 mb-1 flex items-center gap-1.5">
                  <span>⚽</span> 스포츠 영역
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  기능과 전략을 게임에 적용하고 협력·배려 실천 (기술형: 표적·기록·투기, 전략형: 영역·필드·네트, 생태형: 민속·놀이)
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm">
                <div className="font-black text-purple-700 mb-1 flex items-center gap-1.5">
                  <span>🎭</span> 표현 영역
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  생각과 감정을 창의적으로 표현하고 심미성 감상 (기본 움직임 표현, 사물·자연 모방, 리듬, 현대 및 스포츠 표현)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            {/* Step 1 */}
            <section className="bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100">
              <h3 className="text-xl font-black text-cyan-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm shadow-md">1</span> 
                수업 준비하기 (교사 기본 세팅)
              </h3>
              <ul className="list-disc pl-6 text-slate-700 space-y-3 font-medium">
                <li><strong className="text-cyan-800">미션 템플릿 만들기:</strong> 교사 제어 패널(관리자)의 <strong>[템플릿 관리]</strong> 탭에서 오늘 수업할 체육 동작(예: 스쿼트, 버피)을 미션 버튼으로 등록합니다.</li>
                <li><strong className="text-cyan-800">방 개설:</strong> 등록한 템플릿 하단의 <strong>'새 방 파기'</strong> 버튼을 누르면 4자리 접속 핀 번호(PIN)가 발급됩니다.</li>
                <li><strong className="text-cyan-800">전광판 띄우기:</strong> 교실 앞 TV나 빔 프로젝터에 로비 화면의 <strong>'테스트 방 전광판 보기'</strong>를 띄워두시면 실시간 순위와 애니메이션이 중계되어 몰입감이 극대화됩니다.</li>
              </ul>
            </section>

            {/* Step 2 */}
            <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <h3 className="text-xl font-black text-emerald-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shadow-md">2</span> 
                학생들의 기본 활동 (미션 & 상점)
              </h3>
              <ul className="list-disc pl-6 text-slate-700 space-y-3 font-medium">
                <li><strong className="text-emerald-800">개인/모둠 접속:</strong> 학생들은 스마트폰이나 태블릿으로 로비에 접속해 핀 번호와 자기 조를 선택합니다.</li>
                <li><strong className="text-emerald-800">미션 수행:</strong> 선생님이 <strong>[타이머 시작]</strong>을 누르면 학생들이 체육 미션을 수행하고 버튼을 눌러 점수(에너지)를 획득합니다. 각 미션마다 쿨타임(대기 시간)이 있어 무지성 클릭을 방지합니다.</li>
                <li><strong className="text-emerald-800">빙고 보드:</strong> 3x3 빙고판 탭에서 특정 미션들을 완료해 빙고 줄을 맞추면 엄청난 보너스 점수가 주어집니다. 중앙의 '협동 타일'은 여러 기기가 동시에 눌러야만 열립니다.</li>
                <li><strong className="text-emerald-800">아이템 상점:</strong> 모은 점수를 소모해 미션 점수 2배 획득(버프), 쿨타임 감소, 경쟁 조 해킹(화면 가리기) 등의 아이템을 전략적으로 사용할 수 있습니다.</li>
              </ul>
            </section>

            {/* Step 3 */}
            <section className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
              <h3 className="text-xl font-black text-purple-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm shadow-md">3</span> 
                🎮 흥미진진한 특수 게임 모드 (교사 발동)
              </h3>
              <p className="text-slate-600 mb-4 font-bold text-sm">교사 제어 패널에서 버튼 한 번으로 전체 학생 기기의 모드를 즉시 바꿀 수 있습니다.</p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                  <strong className="text-blue-600 text-lg flex items-center gap-2"><Waves className="w-5 h-5"/> 해일 경보 (통제용)</strong>
                  <p className="text-slate-600 text-sm mt-2">수업이 너무 과열되었거나 설명이 필요할 때 누릅니다. 즉시 모든 학생 기기가 잠기고 대피 경고가 뜹니다. 조용해지면 해제하세요.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-300 shadow-sm">
                  <strong className="text-purple-700 text-lg flex items-center gap-2">⚔️ 보스 레이드</strong>
                  <p className="text-slate-600 text-sm mt-2">경쟁을 멈추고 반 전체가 협동하는 모드입니다. 학생들이 획득하는 점수가 보스 몬스터의 체력을 깎는 대미지로 변환됩니다.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-300 shadow-sm">
                  <strong className="text-green-700 text-lg flex items-center gap-2">🧟 좀비 바이러스 살포</strong>
                  <p className="text-slate-600 text-sm mt-2">랜덤한 조가 좀비로 변합니다! 좀비 조는 미션을 수행하는 대신, 다른 조의 스마트폰 화면에 떠있는 4자리 코드를 찾아 입력하여 감염시켜 점수를 뺏어야 합니다.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-red-300 shadow-sm">
                  <strong className="text-red-700 text-lg flex items-center gap-2">🕵️ 마피아 / 스파이</strong>
                  <p className="text-slate-600 text-sm mt-2">각 조별로 1명씩 남몰래 스파이가 지정됩니다. 스파이는 일반 미션을 수행하는 척하며 팀 점수를 몰래 깎아내려야 합니다!</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-300 shadow-sm">
                  <strong className="text-orange-700 text-lg flex items-center gap-2">🛡️ 진지 방어전</strong>
                  <p className="text-slate-600 text-sm mt-2">가만히 있으면 점수가 1초마다 깎입니다! 깎이는 속도보다 더 빨리, 더 열심히 체육 미션을 수행해서 점수를 유지해야 하는 하드코어 모드입니다.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-300 shadow-sm">
                  <strong className="text-indigo-700 text-lg flex items-center gap-2">📝 돌발 퀴즈 발송</strong>
                  <p className="text-slate-600 text-sm mt-2">운동 중 기습적으로 체육 관련 객관식 퀴즈 팝업을 띄웁니다. 정답을 맞힌 선착순 조만 점수를 독식합니다.</p>
                </div>
              </div>
            </section>

            {/* Step 4 */}
            <section className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
              <h3 className="text-xl font-black text-orange-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm shadow-md">4</span> 
                기타 특수 기능들
              </h3>
              <ul className="list-disc pl-6 text-slate-700 space-y-3 font-medium">
                <li><strong className="text-orange-800">QR 코드 미션:</strong> 학교 곳곳에 선생님이 숨겨둔 QR코드를 스캔하여 숨겨진 히든 점수를 찾을 수 있는 기능이 내장되어 있습니다.</li>
                <li><strong className="text-orange-800">공용 패드 (릴레이 스테이션):</strong> 학생 폰 사용이 불가할 때, 강당 중간에 태블릿 1~2대만 설치해두고 반 전체가 릴레이 달리기로 돌아가며 터치하도록 운영하는 전용 키오스크 모드입니다.</li>
                <li><strong className="text-orange-800">최종 해체 모드:</strong> 타이머가 0초가 되는 순간 게임이 바로 끝나지 않고, 조원 전원이 폰 화면을 5초간 동시에 꾹 누르는 협동 미션을 마쳐야만 게임이 종료됩니다!</li>
              </ul>
            </section>
          </div>
          
          {/* Step 5: 신규 실제 신체활동 게임 8종 안내 */}
            <section className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">5</span>
                <h3 className="text-xl font-black text-cyan-400">
                  🏃 신규 실제 신체활동 게임 8종 가이드
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                학생들이 화면만 터치하는 것을 넘어, 체육관이나 교실에서 실제 공, 표적, 도구 및 친구와의 상호작용을 통해 온몸을 움직이는 <strong>2022 개정 체육과 연계 신규 8종 게임</strong>이 추가되었습니다.
              </p>

              {/* 8종 게임 분류 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 운동 2종 */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm">
                    <span>🏃</span> 운동 영역 (2종)
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li>
                      <strong className="text-white block">🔍 심박 탐정단</strong>
                      안정 시, 30초 운동 직후, 회복 후 15초 맥박 변화를 관찰하고 그래프로 분석합니다.
                    </li>
                    <li>
                      <strong className="text-white block">🤖 자세 수호 로봇</strong>
                      의자 앉기, 짐 들기 등 일상 5대 바른 자세를 10초간 유지하며 로봇 부품을 수리합니다.
                    </li>
                  </ul>
                </div>

                {/* 스포츠 4종 */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-400 font-black text-sm">
                    <span>⚽</span> 스포츠 영역 (4종)
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li>
                      <strong className="text-white block">🥌 공 굴림 컬링 원정</strong>
                      바닥 동심원 표적으로 실제 공을 굴려 5회 시도 점수와 힘 조절 능력을 기릅니다.
                    </li>
                    <li>
                      <strong className="text-white block">🥅 패스 게이트 구조대</strong>
                      콘 게이트 사이로 모둠원 전원이 협력 패스를 성공시키는 전략 게임입니다.
                    </li>
                    <li>
                      <strong className="text-white block">🥁 드리블 박자 공장</strong>
                      BPM 박자 메트로놈에 맞춰 20초간 손/발로 실제 공을 일정하게 통제합니다.
                    </li>
                    <li>
                      <strong className="text-white block">🗺️ 빈 공간 설계자</strong>
                      미니 전술판에서 공간 침투 전술을 설계하고 실제 코트에서 1분간 실행합니다.
                    </li>
                  </ul>
                </div>

                {/* 표현 2종 */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-400 font-black text-sm">
                    <span>🎭</span> 표현 영역 (2종)
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li>
                      <strong className="text-white block">🌡️ 감정 온도계</strong>
                      감정과 강도(1~5단계)를 온몸으로 표현하고 짝꿍과 감상을 나눕니다.
                    </li>
                    <li>
                      <strong className="text-white block">🤖 파트너 로봇 연구소</strong>
                      팔·다리·몸통 카드로 창의적 로봇 시퀀스를 만들어 짝과 교대로 시연합니다.
                    </li>
                  </ul>
                </div>
              </div>

              {/* 필수 운영 및 안전 수칙 안내 */}
              <div className="bg-slate-950/90 p-5 rounded-2xl border border-amber-500/30 space-y-3 text-xs">
                <h4 className="text-amber-400 font-black flex items-center gap-1.5 text-sm">
                  ⚠️ 교사 및 학생 필수 안내 사항
                </h4>
                <ul className="space-y-2 text-slate-300 leading-relaxed list-disc list-inside">
                  <li>
                    <strong className="text-white">실제 공·도구 사용 및 안전거리:</strong> 컬링, 패스 게이트 등 공을 사용하는 활동 시 공을 던지지 않고 바닥으로 굴리며, 주변 2m 이상의 안전거리를 유지하도록 지도해 주세요.
                  </li>
                  <li>
                    <strong className="text-white">짝·모둠 활동 신체 접촉 금지:</strong> 파트너 로봇 연구소 등 표현 활동 시 상대의 신체를 강제로 잡지 않고, 오직 말과 시범으로만 전달하도록 안내합니다.
                  </li>
                  <li>
                    <strong className="text-white">심박수 기록의 교육적 성격:</strong> 심박 탐정단의 맥박 기록은 의료 진단이나 건강 판정 목적이 아니며, 운동 전후 신체의 자연스러운 반응을 학습하기 위한 교육용 관찰 지표입니다. (정상/비정상 구분 및 순위 비교 금지)
                  </li>
                  <li>
                    <strong className="text-white">독립 실행형 운영 안내:</strong> 신규 신체활동 8종은 각 게임 컴포넌트 내부 상태를 활용하는 독립 실행형 게임이며, 현재 실시간 PIN 모둠 시스템 및 전광판 데이터베이스에는 직접 연동되지 않습니다.
                  </li>
                </ul>
              </div>
            </section>
          
          <div className="mt-10 pt-6 border-t border-slate-200">
            <p className="text-center text-slate-500 font-bold text-sm">
              💡 팁: 교실 앞 TV에 <strong>'테스트 방 전광판 보기'</strong>(로비 메뉴) 화면을 띄워두시면<br/>
              모둠별 실시간 랭킹과 진행 상황을 중계할 수 있어 훨씬 박진감 넘치는 수업이 됩니다!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
