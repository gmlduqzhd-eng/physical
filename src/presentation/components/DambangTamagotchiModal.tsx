import React, { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { useTamagotchi, TAMAGOTCHI_ITEMS } from '../../application/useTamagotchi';

interface DambangTamagotchiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DambangTamagotchiModal: React.FC<DambangTamagotchiModalProps> = ({ isOpen, onClose }) => {
  const { state, level, currentLevelXp, nextLevelXp, buyItem, equipItem } = useTamagotchi();
  const [tab, setTab] = useState<'status' | 'shop'>('status');
  const [petMessage, setPetMessage] = useState('오늘도 신나게 운동해볼까?');

  if (!isOpen) return null;

  const handlePet = () => {
    const messages = [
      '간지러워요! 에헤헤~ 💦',
      '체력 100% 충전 완료!',
      '선생님, 저랑 미니게임 한판 더 해요!',
      '땀을 흘리니 기분이 상쾌해요! ✨'
    ];
    setPetMessage(messages[Math.floor(Math.random() * messages.length)]);
  };

  const equippedHatItem = TAMAGOTCHI_ITEMS.find(i => i.id === state.equippedHat);
  const equippedAccItem = TAMAGOTCHI_ITEMS.find(i => i.id === state.equippedAccessory);
  const equippedMedalItem = TAMAGOTCHI_ITEMS.find(i => i.id === state.equippedMedal);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 탭 */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <button
            onClick={() => setTab('status')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === 'status'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💧 내 땀방이 (Lv.{level})
          </button>
          <button
            onClick={() => setTab('shop')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              tab === 'shop'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            아이템 상점
          </button>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
            <span>🪙 {state.coins} P</span>
          </div>
        </div>

        {tab === 'status' ? (
          <div>
            {/* 캐릭터 쇼케이스 영역 */}
            <div className="relative bg-gradient-to-b from-cyan-950/40 to-slate-950/60 border border-cyan-500/30 rounded-2xl p-6 text-center overflow-hidden mb-5">
              {/* 말풍선 */}
              <div className="inline-block bg-white text-slate-900 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg mb-3 animate-pulse">
                {petMessage}
              </div>

              {/* 땀방이 SVG 캐릭터 */}
              <div
                onClick={handlePet}
                className="w-36 h-36 mx-auto relative cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
              >
                {/* 물방울 몸체 */}
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_20px_rgba(6,182,212,0.4)]">
                  <defs>
                    <linearGradient id="dropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>
                  {/* 물방울 형태 곡선 */}
                  <path
                    d="M 50,10 C 50,10 80,45 80,68 C 80,85 66,95 50,95 C 34,95 20,85 20,68 C 20,45 50,10 50,10 Z"
                    fill="url(#dropGrad)"
                  />
                  {/* 하이라이트 광택 */}
                  <path
                    d="M 45,25 C 45,25 32,50 32,65 C 32,73 35,78 35,78 C 30,73 28,65 28,60 C 28,45 45,25 45,25 Z"
                    fill="white"
                    opacity="0.5"
                  />
                  {/* 눈 (깜빡임 애니메이션) */}
                  <circle cx="40" cy="62" r="4.5" fill="#0f172a" />
                  <circle cx="42" cy="60" r="1.5" fill="white" />
                  <circle cx="60" cy="62" r="4.5" fill="#0f172a" />
                  <circle cx="62" cy="60" r="1.5" fill="white" />
                  {/* 볼터치 */}
                  <ellipse cx="33" cy="68" rx="4" ry="2" fill="#f43f5e" opacity="0.6" />
                  <ellipse cx="67" cy="68" rx="4" ry="2" fill="#f43f5e" opacity="0.6" />
                  {/* 입 */}
                  <path d="M 46,69 Q 50,75 54,69" stroke="#0f172a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>

                {/* 착용 중인 모자 */}
                {equippedHatItem && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl filter drop-shadow">
                    {equippedHatItem.emoji}
                  </div>
                )}
                {/* 착용 중인 액세서리 */}
                {equippedAccItem && (
                  <div className="absolute bottom-2 right-1 text-2xl filter drop-shadow">
                    {equippedAccItem.emoji}
                  </div>
                )}
                {/* 착용 중인 메달 */}
                {equippedMedalItem && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl filter drop-shadow">
                    {equippedMedalItem.emoji}
                  </div>
                )}
              </div>

              <p className="text-xs text-cyan-300/80 mt-2">💧 캐릭터를 탭하면 기뻐해요!</p>
            </div>

            {/* 레벨 & 경험치 프로그레스 */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 mb-4">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-cyan-400">레벨 {level} 땀방이</span>
                <span className="text-slate-400">{currentLevelXp} / {nextLevelXp} XP</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentLevelXp / nextLevelXp) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                🎮 미니게임을 1판 완료할 때마다 +15 XP와 +20 포인트를 얻어요!
              </p>
            </div>

            {/* 보유 인벤토리 장착 슬롯 */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-2">보유 아이템 착용 / 해제</h4>
              <div className="grid grid-cols-4 gap-2">
                {TAMAGOTCHI_ITEMS.filter(item => state.inventory.includes(item.id)).map(item => {
                  const isEquipped =
                    state.equippedHat === item.id ||
                    state.equippedAccessory === item.id ||
                    state.equippedMedal === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => equipItem(item)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isEquipped
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[10px] font-bold truncate max-w-full text-slate-200">
                        {item.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          isEquipped ? 'bg-cyan-400 text-slate-950' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isEquipped ? '착용중' : '장착'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* 상점 탭 */
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {TAMAGOTCHI_ITEMS.map(item => {
              const isOwned = state.inventory.includes(item.id);
              const isLevelLocked = level < item.requiredLevel;
              return (
                <div
                  key={item.id}
                  className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {isLevelLocked ? `🔒 레벨 ${item.requiredLevel} 이상 해금` : `가격: ${item.cost} P`}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isOwned ? (
                      <span className="text-xs font-bold text-cyan-400 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30">
                        보유중
                      </span>
                    ) : (
                      <button
                        onClick={() => buyItem(item)}
                        disabled={isLevelLocked || state.coins < item.cost}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          isLevelLocked || state.coins < item.cost
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                        }`}
                      >
                        구매 ({item.cost}P)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
