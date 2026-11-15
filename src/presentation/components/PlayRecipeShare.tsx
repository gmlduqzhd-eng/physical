import {useState} from 'react';
import {playRecipeLink,type PlayRecipe} from '../../domain/playRecipes';
export function PlayRecipeShare({recipe}:{recipe:PlayRecipe}){
 const [link,setLink]=useState(''),[message,setMessage]=useState('');
 const copy=async()=>{const value=playRecipeLink(window.location.origin,recipe);setLink(value);try{await navigator.clipboard.writeText(value);setMessage('공개 수업 조건 링크를 복사했어요. 방·명단·점수·복구키는 포함하지 않았어요.');}catch{setMessage('아래 공개 링크를 선택해 복사해 주세요.');}};
 return <details className="play-recipe-share"><summary>이 구성으로 수업 재현·공유</summary><p>활동·시간·모둠 수·게임 규칙만 복사해요. 받은 교사는 조건과 안전을 다시 확인하고 새 수업방을 만듭니다. 이 링크가 현장 효과나 교사 인증을 증명하지는 않아요.</p><button onClick={()=>void copy()}>공개 수업 조건 링크 복사</button>{link&&<label>복사할 공개 링크<input aria-label="공개 수업 조건 링크" readOnly value={link} onFocus={e=>e.target.select()}/></label>}<p role="status">{message}</p></details>;
}
