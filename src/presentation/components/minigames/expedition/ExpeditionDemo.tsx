import {useEffect,useState} from 'react';

/**
 * 준비 화면의 시범 순서. 펼친 채로 2초마다 다음 단계를 자동으로 비춰 처음 온 사람도 흐름을 본다.
 * 화면이 숨겨지면 멈추고, 버튼으로 멈추거나 다시 볼 수 있다. 점수와 상관없다.
 */
export function ExpeditionDemo({steps,roles=[]}:{steps:string[];roles?:string[]}){
  const [playing,setPlaying]=useState(true),[step,setStep]=useState(0);
  const count=steps.length;
  useEffect(()=>{
    if(!playing||count<2)return;
    const timer=setInterval(()=>{if(document.hidden)return;setStep(n=>(n+1)%count);},2000);
    return()=>clearInterval(timer);
  },[playing,count]);
  const active=step%Math.max(1,count);
  return <section className="expedition-demo" aria-label="이렇게 진행해요">
    <h3>이렇게 진행해요</h3>
    <ol>{steps.map((cue,i)=><li key={i} aria-current={active===i?'step':undefined}><span aria-hidden="true">{active===i?'▶':i+1}</span>{cue}</li>)}</ol>
    {roles.length>1&&<p className="expedition-demo-roles">{roles.join(' · ')}</p>}
    <button onClick={()=>setPlaying(v=>!v)}>{playing?'시범 멈추기':'시범 다시 보기'}</button>
  </section>;
}
