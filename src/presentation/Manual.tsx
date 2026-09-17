import { useNavigate } from 'react-router-dom';
import { Home, Sparkles, Smartphone, Monitor, Users, User, ShieldCheck, Timer } from 'lucide-react';

export const Manual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 p-4 md:p-10 font-sans pb-24 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        {/* 상단 헤더 네비게이션 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-950/90 backdrop-blur-md py-4 z-20 border-b border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-black text-cyan-400 flex items-center gap-2.5">
            <span className="text-3xl">📖</span> 땀방울 원정대 공식 사용 설명서
          </h1>
          <button 
            onClick={() => navigate('/')} 
            className="shrink-0 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 shadow-md rounded-xl font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all active:scale-95"
          >
            <Home className="w-4 h-4 text-cyan-400"/> 홈으로 돌아가기
          </button>
        </div>

        {/* 본문 컨테이너 */}
        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-10">
          
          {/* 타이틀 및 개요 */}
          <div className="text-center pb-6 border-b border-slate-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> 2022 개정 초등 체육과 교육과정 연계
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              총 49종 스마트 체육 활동 &amp; 교실 수업 완전 정복 가이드
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl mx-auto leading-relaxed">
              화면 터치형 센서 미니게임부터 교실·강당에서 실제 공과 도구로 온몸을 움직이는 활동까지!
              학생들의 신체활동 역량과 협동심을 기를 수 있도록 설계된 학교 체육 수업 플랫폼입니다.
            </p>
          </div>

          {/* 1. 2022 개정 교육과정 3대 영역 및 성취기준 체계 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">1</span>
              2022 개정 체육과 3대 영역 (총 49종 게임)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              2022 개정 교육과정 기준에 맞추어 <strong className="text-emerald-400">운동 (20종)</strong>, <strong className="text-blue-400">스포츠 (22종)</strong>, <strong className="text-purple-400">표현 (7종)</strong>의 3개 대영역으로 체계적으로 분류되어 있으며, 모든 활동 카드에서 학년군별 성취기준 코드와 세부 목표를 열람할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/30">
                <div className="font-black text-emerald-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">🏃 운동 영역</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">20종</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  자신의 체력 수준을 이해하고 건강 체력(근력, 유연성, 심폐지구력) 및 운동 체력(순발력, 민첩성, 평형성)을 기르는 활동
                </p>
                <div className="mt-2 text-[11px] text-slate-500">
                  대표: 심박 탐정단, 자세 수호 로봇, 스쿼트 챌린지, 제자리 달리기, 버피 점프 등
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-blue-500/30">
                <div className="font-black text-blue-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">⚽ 스포츠 영역</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">22종</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  기술형(표적·기록·투기), 전략형(영역·필드·네트), 생태형(민속·놀이) 스포츠 기능과 공간 전술, 규칙과 협동심 실천
                </p>
                <div className="mt-2 text-[11px] text-slate-500">
                  대표: 공 굴림 컬링, 패스 게이트 구조대, 드리블 박자 공장, 빈 공간 설계자 등
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-purple-500/30">
                <div className="font-black text-purple-400 text-sm mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">🎭 표현 영역</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">7종</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  신체 움직임을 통해 생각과 정서를 창의적으로 나타내고, 리듬과 감정을 교감하며 심미적 가치를 감상하는 활동
                </p>
                <div className="mt-2 text-[11px] text-slate-500">
                  대표: 감정 온도계, 파트너 로봇 연구소, 댄스 포즈 마스터, 동물 흉내 체조 등
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
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              학교 교실과 체육관의 다양한 ICT 인프라(학생 스마트폰, 학교 태블릿 PC, 교탁 데스크톱 PC 등)에 맞춰 수업에 활용할 수 있도록 필터를 지원합니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 기기 분류 */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> 지원 기기별 안내
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-white">📱 스마트폰 (49종):</strong> 들고 뛰기, 흔들기, 점프 센서 인식, 화면 터치 등 모바일 기기의 기동성을 극대화한 활동
                  </li>
                  <li>
                    <strong className="text-white">📟 태블릿 PC (49종):</strong> 넓은 화면으로 시인성이 뛰어나며, 전술판 드래그, 2인 이상 모둠 짝 활동에 최적화
                  </li>
                  <li>
                    <strong className="text-white">🖥️ 데스크톱 PC (46종):</strong> 마우스 클릭 및 키보드 조작 완벽 지원 (센서 미지원 PC에서도 클릭/터치 폴백 조작으로 참여 가능)
                  </li>
                </ul>
              </div>

              {/* 활동 형태 */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 활동 형태별 안내
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-white"><User className="inline w-3.5 h-3.5 mr-1 text-slate-400" />개인 게임 (36종):</strong> 자신의 체력 측정, 순발력, 민첩성, 밸런스 유지 등 개인별 목표 달성형 도전 과제
                  </li>
                  <li>
                    <strong className="text-white"><Users className="inline w-3.5 h-3.5 mr-1 text-amber-400" />협동 게임 (13종):</strong> 2인 짝 또는 모둠원 전원이 협력하여 패스, 전술 침투, 역할 교대, 배려를 발휘하는 팀워크 중심 과제
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 게임 준비 시간 3초 단축 및 PC 클릭 폴백 */}
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">3</span>
              수업 최적화: 3초 카운트다운 &amp; PC 클릭 대체 조작
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> 경쾌한 3초 준비 카운트다운
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  기존의 긴 대기시간(5초)을 <strong>3초</strong>로 단축하여 학생들의 집중력이 흐트러지지 않고 경쾌하게 실제 신체활동으로 바로 진입할 수 있도록 개선하였습니다.
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-sm text-teal-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> PC 환경 마우스 클릭 폴백
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  점프왕, 제자리 달리기, 스쿼트 등 모바일 센서 전용 게임을 데스크톱 PC나 센서 미지원 기기에서 시연할 때도 화면 클릭/스페이스바로 카운트를 증가시킬 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 4. 신규 실제 신체활동 8종 상세 가이드 */}
          <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/30">4</span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                🏃 온몸으로 뛰는 신규 신체활동 8종 수업 팁
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              화면만을 보는 정적인 수업에서 벗어나 교실 및 체육관 바닥, 실제 공·도구, 짝과의 신체 표현을 종합적으로 활용합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-emerald-500/20 space-y-1">
                <div className="font-black text-emerald-400 flex items-center gap-1.5">
                  <span>🔍</span> 심박 탐정단 (운동)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  안정 시, 30초 점핑잭 직후, 1분 휴식 후의 15초 맥박수를 측정하여 신체 회복 탄력성과 운동 생리를 체득합니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-emerald-500/20 space-y-1">
                <div className="font-black text-emerald-400 flex items-center gap-1.5">
                  <span>🤖</span> 자세 수호 로봇 (운동)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  바르게 앉기, 물건 들기, 서 있기 등 5대 척추 건강 자세를 10초간 바르게 유지하며 몸의 균형 감각을 익힙니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-blue-500/20 space-y-1">
                <div className="font-black text-blue-400 flex items-center gap-1.5">
                  <span>🥌</span> 공 굴림 컬링 원정 (스포츠 기술형)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  실제 배구공이나 짐볼을 바닥 동심원 표적으로 조심스럽게 굴려 표적에 멈추도록 하는 섬세한 힘 조절 활동입니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-blue-500/20 space-y-1">
                <div className="font-black text-blue-400 flex items-center gap-1.5">
                  <span>🥅</span> 패스 게이트 구조대 (스포츠 전략형)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  장애물 콘 게이트 사이로 모둠원 전원이 원터치 패스를 성공시켜 점수를 획득하는 모둠 협동 패스 활동입니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-blue-500/20 space-y-1">
                <div className="font-black text-blue-400 flex items-center gap-1.5">
                  <span>🥁</span> 드리블 박자 공장 (스포츠 전략형)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  60/90/120 BPM 메트로놈 비트 박자에 맞춰 손 또는 발로 실제 공을 일정하게 튀기며 공 통제 리듬을 체득합니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-blue-500/20 space-y-1">
                <div className="font-black text-blue-400 flex items-center gap-1.5">
                  <span>🗺️</span> 빈 공간 설계자 (스포츠 전략형)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  미니 전술판 드래그로 공간 침투 경로를 작전회의한 뒤, 실제 코트에서 1분간 팀원이 역할을 수행하며 전술을 완성합니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-purple-500/20 space-y-1">
                <div className="font-black text-purple-400 flex items-center gap-1.5">
                  <span>🌡️</span> 감정 온도계 (표현)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  기쁨, 긴장, 분노 등 5대 감정을 1단계(미세)부터 5단계(폭발)까지 온몸의 표정과 자세로 나타내고 짝과 교감합니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-purple-500/20 space-y-1">
                <div className="font-black text-purple-400 flex items-center gap-1.5">
                  <span>🤖</span> 파트너 로봇 연구소 (표현)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  팔·다리·몸통 움직임 카드를 모둠원과 조합하여 기계음 구령에 맞춰 짝과 로봇 시연을 번갈아 진행합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 5. 안전 및 수업 운영 수칙 */}
          <section className="bg-amber-950/30 p-5 sm:p-6 rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-amber-400 font-black flex items-center gap-2 text-sm sm:text-base">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> 교사 및 학생 필수 안전 수칙
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-white">주변 안전거리 확보:</strong> 공을 굴리거나 신체 표현을 할 때 다른 모둠이나 벽, 책상과 최소 2m 이상 거리를 둡니다.
              </li>
              <li>
                <strong className="text-white">무리한 신체 접촉 금지:</strong> 협동 및 짝 활동 시 친구의 몸을 강제로 잡아당기지 않고 신호와 구령으로 협력합니다.
              </li>
              <li>
                <strong className="text-white">심박수 교육용 관찰:</strong> 심박 탐정단의 맥박 측정은 신체 반응을 탐구하는 교육 활동이며, 진단이나 타인과의 승패 비교용이 아닙니다.
              </li>
              <li>
                <strong className="text-white">스마트 기기 낙하 주의:</strong> 센서 게임 시 스트랩을 착용하거나 양손으로 안전하게 파지하도록 지도합니다.
              </li>
            </ul>
          </section>

          {/* 하단 푸터 안내 */}
          <div className="pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-xs font-medium">
              땀방울 원정대 ⓒ2026. 엽쌤 All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
