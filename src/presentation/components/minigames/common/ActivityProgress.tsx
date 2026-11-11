import './ActivityProgress.css';
export function ActivityProgress({steps,current,results=[]}:{steps:string[];current:number;results:('complete'|'partial')[]}){
 return <ol className="activity-progress" aria-label="활동 과제와 확인한 진행">{steps.map((step,i)=><li key={i} aria-current={i===current?'step':undefined} data-state={results[i]??(i===current?'current':'next')}><span aria-hidden="true">{results[i]==='complete'?'✓':results[i]==='partial'?'◇':i+1}</span><strong>{step}</strong><small>{results[i]==='complete'?'직접 확인':results[i]==='partial'?'도전 기록':i===current?'지금 할 과제':'다음 과제'}</small></li>)}</ol>;
}
