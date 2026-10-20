import { createGoogle } from '@ai-sdk/google';
import { studioInputSchema } from '../teacher-studio/domain.js';
import { generateAdvice, sources } from './aiService.js';
import type {TeacherInput} from '../src/domain/teacherAi.js';
import { z } from 'zod';

// Google rejects some deeply constrained JSON Schemas with a generic 400.
// Transmit just the shape; aiService.validateOutput still enforces the complete
// strict schema, length limits, references and time totals before displaying it.
const citation = z.object({ sourceId: z.string() });
export const geminiTransportSchema = z.object({
  title: z.string(),
  recommendations: z.array(z.object({ activityId: z.string(), reason: z.string(), citations: z.array(citation) })),
  sections: z.array(z.object({ heading: z.string(), minutes: z.number().nullable(), content: z.string(), citations: z.array(citation) })),
  safety: z.array(citation),
  teacherChecks: z.array(z.string()).min(1).max(6),
});

export const defaultGeminiModel = 'gemini-3.1-flash-lite';
export function geminiReady() { return !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL && process.env.GEMINI_PUBLIC_DATA_REVIEWED === 'true'; }
export async function generateStudioAdvice(raw: unknown) {
  const input = studioInputSchema.parse(raw);
  if (!geminiReady()) throw new Error('Gemini 키와 공개 자료 이용 확인을 먼저 저장하세요.');
  const { adultTeacher, consent, ...context } = input;
  if (!adultTeacher || !consent) throw new Error('교사 확인이 필요합니다.');
  const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
  const providerContext = context.task === 'group' ? Object.fromEntries(Object.entries(context).filter(([key]) => !['classSize','groupSize'].includes(key))) : context;
  const references=new Map<string,{activityId:string;field:string;quote:string}>();
  const materials=sources({...context,consent:true} as TeacherInput).map(game=>{
    const sourceReferences:Record<string,{sourceId:string;quote:string}[]>={};
    for(const field of ['description','grades','devices','space','safety','equipment'] as const){
      const value=game[field];const quotes=Array.isArray(value)?value:[value];
      sourceReferences[field]=quotes.map((quote,index)=>{const sourceId=game.id+':'+field+':'+index;references.set(sourceId,{activityId:game.id,field,quote});return{sourceId,quote};});
    }
    return {id:game.id,name:game.name,duration:game.duration,deviceMode:game.deviceMode,playMode:game.playMode,goal:game.goal,sourceReferences};
  });
  const resolve=(sourceId:string)=>{const value=references.get(sourceId);if(!value)throw new Error('목록에 없는 원문 참조입니다.');return value;};
  const recommendationsOnly=['recommend','alternative'].includes(context.task);
  const headings={difficulty:['기초','보통','도전'],plan:['도입','준비운동','본활동','정리','안전 지도'],safety:[],mission:['협동 목표','역할과 진행','완료 확인'],observation:['관찰 요약','다음 차시 아이디어'],group:['모둠 결과 요약','활동 조정안'],reflection:['성찰 질문'],participation:['오늘의 몸 미션','역할 바꾸기','기다리는 동안'],recommend:[],alternative:[]}[context.task];
  const section=geminiTransportSchema.shape.sections.element.extend({heading:headings.length?z.enum(headings as [string,...string[]]):z.string(),minutes:context.task==='plan'?z.number():z.null()});
  const taskSchema=geminiTransportSchema.extend({recommendations:recommendationsOnly?geminiTransportSchema.shape.recommendations.length(3):geminiTransportSchema.shape.recommendations.max(0),sections:z.array(section).length(headings.length)});
  return generateAdvice({ ...context, consent: true }, {
    model: google(process.env.GEMINI_MODEL!), modelId: process.env.GEMINI_MODEL!, context: providerContext, schema: taskSchema,
    providerOptions: { google: { thinkingConfig: { thinkingLevel: 'low' } } }, timeoutMs: 90000,
    materials,
    extraInstructions:'\n이 연결에서는 위 인용 형식을 다음 방식으로 대체한다. citations의 각 항목과 safety의 각 항목은 {sourceId} 하나만 반환한다. sourceId는 activities.sourceReferences에 있는 번호를 그대로 선택한다. 원문을 직접 작성하거나 여러 문장을 합치지 않는다. safety는 field가 safety인 자료 번호만 선택한다. 입력 확인 요약은 citations=[]이다. safety 원문이 제공되었으면 최소 1개를 선택하고 안전 자료가 부족하다고 쓰지 않는다.',
    transformOutput(raw){const result=geminiTransportSchema.parse(raw);return{...result,recommendations:result.recommendations.map(r=>({...r,citations:r.citations.map(c=>resolve(c.sourceId))})),sections:result.sections.map(s=>({...s,citations:s.citations.map(c=>resolve(c.sourceId))})),safety:result.safety.map(c=>{const ref=resolve(c.sourceId);if(ref.field!=='safety')throw new Error('검증되지 않은 안전 원문 참조입니다.');return{activityId:ref.activityId,quote:ref.quote};})};},
  });
}
