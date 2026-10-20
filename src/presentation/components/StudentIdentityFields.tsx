interface Props {
  number: string;
  nickname: string;
  onNumberChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
}

export function StudentIdentityFields({number,nickname,onNumberChange,onNicknameChange}:Props) {
  return <div className="grid gap-3 sm:grid-cols-2 my-4">
    <label className="block font-semibold">학생 번호 (1~99)
      <input className="block w-full border rounded-xl p-3 mt-2" type="text" inputMode="numeric" autoComplete="off" required maxLength={2} pattern="(?:[1-9]|[1-9][0-9])" placeholder="예: 12" value={number} onChange={event=>onNumberChange(event.target.value.replace(/\D/g,'').slice(0,2))}/>
    </label>
    <label className="block font-semibold">별명 (2~12자)
      <input className="block w-full border rounded-xl p-3 mt-2" type="text" autoComplete="off" required minLength={2} maxLength={12} placeholder="친구에게 보일 별명" value={nickname} onChange={event=>onNicknameChange(event.target.value)}/>
    </label>
  </div>;
}
