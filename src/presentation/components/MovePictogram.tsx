import type {ScreenMove} from '../../domain/sharedScreen';

const LABEL:Record<ScreenMove,string>={open:'손바닥을 편 모습',wings:'두 팔을 작게 펼친 모습',step:'제자리에서 발을 번갈아 디디는 모습',knees:'앉아서 양손을 무릎에 짚은 모습',rest:'편하게 서서 쉬는 모습'};

/** A simple figure for each shared-screen movement, so the picture shows what the words say. */
export function MovePictogram({move,className=''}:{move:ScreenMove;className?:string}){
 return <svg className={className} viewBox="0 0 100 100" role="img" aria-label={LABEL[move]} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
  {move==='open'&&<>
   <path d="M34 62V34M44 58V22M54 58V20M64 60V26"/>
   <path d="M34 62c0 16 8 24 20 24s18-9 18-22l2-18"/>
   <path d="M34 54l-9-9"/>
  </>}
  {move==='wings'&&<>
   <circle cx="50" cy="18" r="9"/>
   <path d="M50 28v34M50 62l-11 26M50 62l11 26"/>
   <path d="M50 38L26 44M50 38l24 6"/>
   <path d="M14 40l-6 5 6 5M86 40l6 5-6 5" strokeWidth="4"/>
  </>}
  {move==='step'&&<>
   <circle cx="50" cy="16" r="9"/>
   <path d="M50 26v32"/>
   <path d="M50 58l-8 30"/>
   <path d="M50 58l15 8-4 16"/>
   <path d="M50 36l-13 12M50 36l14 8"/>
   <path d="M30 92h20M58 88h14" strokeWidth="4"/>
  </>}
  {move==='knees'&&<>
   <circle cx="42" cy="18" r="9"/>
   <path d="M42 28v28h26v28"/>
   <path d="M42 38l22 16"/>
   <path d="M30 56v30M30 66h12" strokeWidth="4"/>
  </>}
  {move==='rest'&&<>
   <circle cx="50" cy="18" r="9"/>
   <path d="M50 28v34M50 62l-8 26M50 62l8 26"/>
   <path d="M50 38l-9 22M50 38l9 22"/>
  </>}
 </svg>;
}
