
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
            <p className="text-lg text-slate-600 font-bold">학생들이 게임처럼 열광하는 체육 수업 플랫폼!</p>
            <p className="text-sm text-slate-500 mt-2">단순한 체력 측정을 넘어, 다양한 미니게임과 RPG 요소를 결합한 수업 가이드입니다.</p>
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
