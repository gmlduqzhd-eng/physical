
import { useNavigate } from 'react-router-dom';
import { Waves, Bug, Home } from 'lucide-react';

export const Manual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans pb-20">
      <div className="max-w-4xl mx-auto space-y-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <h1 className="text-3xl font-black text-cyan-600">
            📖 땀방울 원정대 사용 설명서
          </h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <Home className="w-4 h-4"/> 홈으로 돌아가기
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="text-center pb-6 border-b border-slate-100">
            <p className="text-slate-500">선생님과 학생들을 위한 앱 구동 및 활용 가이드입니다.</p>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-xl font-bold text-cyan-600 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">1</span> 
                수업 준비하기 (방 만들기)
              </h3>
              <ul className="list-disc pl-10 text-slate-700 space-y-2 leading-relaxed">
                <li>교사 제어 패널의 <strong>[템플릿 관리]</strong> 탭에서 학년/학기에 맞는 미션 템플릿을 선택하거나 새 템플릿을 만듭니다.</li>
                <li>원하는 템플릿의 <strong>'이 템플릿으로 새 방 파기'</strong> 버튼을 눌러 수업용 방을 개설합니다.</li>
                <li>방이 생성되면 <strong>4자리 접속 핀 번호(PIN)</strong>가 발급됩니다. 이 번호를 학생들에게 안내하세요.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-cyan-600 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">2</span> 
                학생 접속 및 진행
              </h3>
              <ul className="list-disc pl-10 text-slate-700 space-y-2 leading-relaxed">
                <li>학생들은 태블릿/스마트폰으로 메인 화면에 접속하여 <strong>핀 번호</strong>와 <strong>자신의 모둠</strong>을 선택해 입장합니다.</li>
                <li>모든 학생이 준비되면 교사 제어 패널에서 <strong>[타이머 시작]</strong> 버튼을 눌러 미션을 시작합니다.</li>
                <li>학생들은 화면에 나타난 체력 미션(예: 버피테스트 5회)을 수행하고 완료 버튼을 눌러 점수(에너지)를 획득합니다.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-cyan-600 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">3</span> 
                돌발 이벤트 활용 (교사 제어)
              </h3>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <strong className="text-blue-600 text-lg flex items-center gap-1"><Waves className="w-5 h-5"/> 해일 경보 발동</strong>
                  <p className="text-slate-600 mt-1">
                    학생들이 너무 흥분하거나 정리가 필요할 때 사용합니다. 발동 즉시 모든 학생의 화면이 파랗게 변하며 미션이 잠금 처리됩니다.<br/>
                    학생들이 매트 등 <strong>지정된 안전 구역으로 대피</strong>하여 조용해지면 <strong>[해일 경보 해제]</strong>를 눌러 재개합니다.
                  </p>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div>
                  <strong className="text-red-600 text-lg flex items-center gap-1"><Bug className="w-5 h-5"/> 해킹 침투</strong>
                  <p className="text-slate-600 mt-1">
                    특정 모둠이 너무 압도적이거나 반칙을 할 때 페널티를 부여합니다. 해당 모둠의 화면이 빨갛게 변하며 미션이 중단됩니다.<br/>
                    해당 모둠은 직접 <strong>보유한 50점</strong>을 소모해 백신을 구매해야만 다시 활동을 재개할 수 있습니다.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-cyan-600 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">4</span> 
                특별 이벤트 (자동 발생)
              </h3>
              <ul className="list-disc pl-10 text-slate-700 space-y-2 leading-relaxed">
                <li><strong>코어 과부하 (플랭크 타임)</strong>: 타이머가 <strong>정확히 1분(01:00)</strong> 남았을 때 모든 화면에 코어 과부하 경고가 뜹니다.<br/>학생들은 하던 미션을 멈추고 제자리에 엎드려 <strong>30초간 단체 플랭크</strong>를 수행해야 합니다.</li>
                <li><strong>최종 해체 모드</strong>: 타이머가 <strong>0초</strong>가 되면 각 모둠의 폭탄 해체 화면이 나타납니다.<br/>모둠원 전원이 각자의 화면 중앙의 지문을 <strong>5초 동안 동시에 터치(꾹 누르기)</strong> 해야만 최종 클리어 처리됩니다.</li>
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
