import './MascotBadge.css';

/** 처음 화면 삽화의 땀방울 친구들(동그란 그림). main: 머리띠 · ball: 공 든 친구 · jump: 점프하는 친구 */
export type MascotName = 'main' | 'ball' | 'jump';

export function MascotBadge({ name, size = 96, className = '' }: { name: MascotName; size?: number; className?: string }) {
  return <img className={`mascot-badge ${className}`.trim()} src={`/images/mascot-${name}.webp`} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" data-mascot={name}/>;
}

/** 캐릭터 + 말풍선 한 줄 인사. */
export function MascotHello({ name, children }: { name: MascotName; children: string }) {
  return <div className="mascot-hello"><MascotBadge name={name} size={72}/><p>{children}</p></div>;
}
