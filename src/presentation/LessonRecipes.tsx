import {Link,useLocation} from 'react-router-dom';
import {FLAGSHIPS} from '../domain/flagship';
import {STARTER_RECIPES,makePlayRecipe,parsePlayRecipe,playRecipeHash,type PlayRecipe} from '../domain/playRecipes';
import {LEVEL_NAMES} from '../domain/expeditionWorkshop';
import {FlowShell} from './FlowShell';
import {PlayRecipeShare} from './components/PlayRecipeShare';
import './PlayExperiences.css';

function RecipeCard({recipe,title,steps}:{recipe:PlayRecipe;title:string;steps?:readonly string[]}){
 const meta=FLAGSHIPS.find(g=>g.id===recipe.game)!;
 return <article className="recipe-card"><p className="eyebrow">공개 수업 조건 · 교사 확인 후 새 방 생성</p><h2>{title}</h2><h3>{meta.name}</h3><p>{recipe.groups}모둠 · {recipe.minutes}분 · 모둠당 {recipe.settings.members}자리 · {LEVEL_NAMES[recipe.settings.level]} 가상 규칙</p><p>{meta.device}</p>{steps&&<ol>{steps.map(s=><li key={s}>{s}</li>)}</ol>}<p>교사가 장소·간격·기기 거치·참여 의사를 확인하고 작은 동작·앉은 대안을 안내해 주세요. 역할 교대와 수행 확인은 자동 측정이 아닙니다.</p><div className="flagship-row"><Link className="primary" to={'/teacher/setup'+playRecipeHash(recipe)}>이 설정으로 수업 준비</Link><Link to={'/solo/play/'+recipe.game}>전체 규칙 먼저 연습</Link></div><PlayRecipeShare recipe={recipe}/></article>;
}
export function LessonRecipes(){
 const location=useLocation(),shared=parsePlayRecipe(location.hash),invalid=location.hash.startsWith('#recipe=')&&!shared;
 return <FlowShell utilities><section className="play-experiences lesson-recipes"><p className="eyebrow">준비를 줄이는 수업 한 장</p><h1>우리 공간에 맞춰 바로 준비해요.</h1><p>아래 꾸러미는 설계 예시이며, 실제 학교에서 효과가 검증됐다는 표시가 아닙니다. 받은 링크도 공개 조건만 담고 있으며 교사·학생의 인증 정보와 기록은 가져오지 않습니다.</p>
  {invalid&&<p role="alert" className="error">공유 조건이 올바르지 않거나 허용되지 않은 정보가 포함돼 있어 가져오지 않았어요. 아래 기본 꾸러미를 골라 주세요.</p>}
  {shared&&<RecipeCard recipe={shared} title="공유받은 수업 구성"/>}
  <article className="recipe-card"><h2>TV·PC 한 대로 하는 입문 놀이</h2><p>개별 학생 입장·명단·서버 점수 없이 공용 화면으로 작은 동작을 안내해요. 기기 부족 상황에서도 사용할 수 있습니다.</p><ol><li>기기 고정과 공간 확인</li><li>짧은 신호 연습</li><li>세 라운드 사이 역할·편안함 확인</li><li>친구의 도움이 된 신호 이야기</li></ol><Link className="primary" to="/together">공용 화면으로 준비</Link></article>
  {STARTER_RECIPES.map(r=><RecipeCard key={r.id} recipe={makePlayRecipe(r.game,6,20)} title={r.title} steps={r.steps}/>)}
  <details className="recipe-print-guide"><summary>수업 전 준비와 공유 주의점</summary><p>Google 교사 인증·안전 확인·기존 점수 검토 절차를 유지합니다. 학생은 실제 수업방에 입장할 때 기존 번호·별명을 입력합니다. 이 페이지에는 학생 명단·운동 기록을 입력하지 마세요.</p><button onClick={()=>window.print()}>수업 꾸러미 인쇄</button></details>
 </section></FlowShell>;
}
