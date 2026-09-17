import type { GameRoom, RoomGroup } from '../../../domain/types';

interface QRCodePanelProps {
  currentRoom: GameRoom;
  roomGroups: RoomGroup[];
  appUrl?: string;
}

export const QRCodePanel = ({ currentRoom, roomGroups, appUrl }: QRCodePanelProps) => {
  const baseUrl = appUrl || window.location.origin;

  const groupNames = roomGroups.length > 0
    ? roomGroups.map(g => g.group_name)
    : Array.from({ length: 8 }, (_, i) => `${i + 1}모둠`);

  return (
    <div className="bg-cyan-50 shadow-sm p-4 rounded-xl border border-cyan-200 print:shadow-none">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-cyan-900 flex items-center gap-2">
          📱 모둠별 입장 QR 코드
        </h2>
        <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-2 text-sm print:hidden">
          🖨️ 인쇄하기
        </button>
      </div>
      <p className="text-sm text-cyan-700 mb-4 print:hidden">학생들이 아래 QR 코드를 스캔하면 이름만 입력하고 바로 입장합니다. 인쇄하여 체육관에 부착하세요.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        {groupNames.map(name => {
          const joinUrl = `${baseUrl}/join?room=${currentRoom.id}&group=${encodeURIComponent(name)}`;
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

          return (
            <div key={name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <h3 className="font-black text-lg text-cyan-700 mb-2">{name}</h3>
              <img src={qrSrc} alt={`${name} 입장 QR`} className="w-32 h-32 mb-2 pointer-events-auto" />
              <p className="text-[10px] text-slate-400 break-all print:hidden">{joinUrl}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-white p-3 rounded-lg border border-cyan-200 print:hidden">
        <p className="text-xs text-cyan-800 font-bold">💡 팁: QR 코드를 A4 용지에 인쇄하여 체육관 벽에 부착하면, 학생들이 달려가서 QR을 찍고 바로 게임에 참여할 수 있습니다!</p>
      </div>
    </div>
  );
};
