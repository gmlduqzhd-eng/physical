import { createGoogle } from '@ai-sdk/google';
import { studioInputSchema } from '../teacher-studio/domain.js';
import { generateAdvice, sources } from './aiService.js';
import type {TeacherInput} from '../src/domain/teacherAi.js';
import { z } from 'zod';
import { APICallError, NoObjectGeneratedError } from 'ai';
import { setTimeout as delay } from 'node:timers/promises';

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

export const defaultGeminiModel = 'gemini-3.5-flash-lite';
export function geminiReady() { return !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL && process.env.GEMINI_PUBLIC_DATA_REVIEWED === 'true'; }
export function studioRetryInstruction(error: unknown): string | null {
  if (NoObjectGeneratedError.isInstance(error) || error instanceof z.ZodError) return '요청된 JSON 구조와 항목 수, 문자열 길이를 지켜 새 결과를 작성한다.';
  if (!(error instanceof Error)) return null;
  if (error.message === '근거가 없는 제안입니다.') return '모든 AI 제안 section에 제공된 sourceId를 1개 이상 넣는다. 입력 확인 요약만 citations=[]이다.';
  if (error.message === '학생용 안내는 항목마다 짧은 한 문장이어야 합니다.') return '학생용 안내 세 항목을 각각 줄바꿈 없이 50자 안팎의 한 문장으로 작성한다. 100자를 넘기지 않는다.';
  if (error.message === '필수 수업 항목이 누락되었습니다.') return '요청된 section heading을 제시한 순서대로 빠짐없이 한 번씩 작성한다.';
  if (error.message === '수업 시간 합계가 맞지 않습니다.') return '지도안의 5개 minutes 합계를 입력한 수업 시간과 정확히 맞춘다.';
  if (error.message === '난이도별 진행·역할·관찰 항목이 필요합니다.' || error.message === '난이도별 조정 내용이 서로 같아서는 안 됩니다.') return '기초·보통·도전 각 content를 진행: / 역할: / 관찰: 로 시작하는 세 줄로 작성한다. 각 수준에서 판단 조건이나 협의의 자율성을 구체적으로 달리하고 관찰할 행동을 적는다.';
  if (error.message === '성찰 질문은 줄바꿈으로 구분한 세 문항이어야 합니다.') return '성찰 질문 content에는 서로 다른 질문 정확히 세 개를 각각 한 줄로 작성한다. 서문이나 맺음말은 넣지 않는다.';
  if (error.message === '제공된 안전 원문이 누락되었습니다.') return '제공된 activities.sourceReferences.safety에서 sourceId를 최소 한 개 이상 골라 safety에 포함한다. 안전 원문을 창작하지 않는다.';
  if (error.message === '필수 수업 인원·활동 시간이 반영되지 않았습니다.') return '협동 미션 본문에 context.groupSize명과 context.activityMinutes분을 실제 입력 숫자로 명시한다.';
  return null;
}

// Only categorical diagnostics leave this boundary, never provider bodies or prompts.
export function studioProviderCategory(error: unknown): string | undefined {
  if (!APICallError.isInstance(error)) return undefined;
  const message = error.message + (error.responseBody ?? '');
  if (/overload|high demand|capacity|resource exhausted/i.test(message) && error.statusCode === 503) return 'provider_overloaded';
  if (error.statusCode === 503) return 'provider_unavailable';
  if ([500, 502, 504].includes(error.statusCode ?? 0)) return 'provider_server_error';
  return undefined;
}

export function studioRetryDelayMs(error: unknown, retry: number, now: number, random: number): number {
  const backoff = 2000 * 2 ** (retry - 1) + Math.floor(random * 1000);
  if (!APICallError.isInstance(error)) return backoff;
  const header = Object.entries(error.responseHeaders ?? {}).find(([key]) => key.toLowerCase() === 'retry-after')?.[1]?.trim();
  if (!header) return backoff;
  const requested = /^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - now;
  return Number.isFinite(requested) ? Math.max(backoff, requested) : backoff;
}

export async function withStudioRecovery<T>(
  generate: (correction: string | null, timeoutMs: number) => Promise<T>,
  runtime = { now: Date.now, sleep: (ms: number) => delay(ms), random: Math.random },
): Promise<T> {
  const started = runtime.now();
  const deadline = started + 90000;
  let correction: string | null = null;
  let formatRetried = false;
  let transientRetries = 0;
  // At most three provider requests share one deadline, including format repair.
  // Quota, payment, auth, configuration and client timeouts never trigger retries.
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await generate(correction, Math.max(1, deadline - runtime.now()));
      if (attempt > 1) console.info('studio_generation_recovered', JSON.stringify({ attempts: attempt, elapsedMs: runtime.now() - started }));
      return result;
    } catch (error) {
      const nextCorrection = studioRetryInstruction(error);
      const transient = APICallError.isInstance(error) && [500, 502, 503, 504].includes(error.statusCode ?? 0);
      if (attempt >= 3 || (!transient && (!nextCorrection || formatRetried))) throw error;
      const waitMs = transient ? studioRetryDelayMs(error, ++transientRetries, runtime.now(), runtime.random()) : 0;
      // Respect Retry-After without sleeping beyond the request budget.
      if (deadline - runtime.now() < waitMs + 10000) throw error;
      if (nextCorrection) { correction = nextCorrection; formatRetried = true; }
      console.info('studio_generation_retry', JSON.stringify({ attempt: attempt + 1, category: studioProviderCategory(error) ?? 'output_validation', delayMs: waitMs }));
      if (waitMs) await runtime.sleep(waitMs);
      if (deadline - runtime.now() < 10000) throw error;
    }
  }
}

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
  return withStudioRecovery((correction, timeoutMs) => generateAdvice({ ...context, consent: true }, {
    model: google(process.env.GEMINI_MODEL!), modelId: process.env.GEMINI_MODEL!, context: providerContext, schema: taskSchema,
    providerOptions: { google: { thinkingConfig: { thinkingLevel: 'low' } } }, timeoutMs,
    materials,
    extraInstructions:'\n이 연결에서는 위 인용 형식을 다음 방식으로 대체한다. citations의 각 항목과 safety의 각 항목은 {sourceId} 하나만 반환한다. sourceId는 activities.sourceReferences에 있는 번호를 그대로 선택한다. 원문을 직접 작성하거나 여러 문장을 합치지 않는다. safety는 field가 safety인 자료 번호만 선택한다. 입력 확인 요약은 citations=[]이다. safety 원문이 제공되었으면 최소 1개를 선택하고 안전 자료가 부족하다고 쓰지 않는다. participation에서는 세 section 각각에 해당 제안과 관련된 원문 sourceId를 citations 배열에 반드시 1개 이상 넣는다. 각 학생용 문장은 50자 안팎으로 짧게 작성한다.'+(correction?'\n앞선 응답이 형식 검사를 통과하지 못했다. '+correction+' 원문에서 뒷받침할 수 없는 제안은 만들지 않는다.':''),
    transformOutput(raw){const result=geminiTransportSchema.parse(raw);return{...result,recommendations:result.recommendations.map(r=>({...r,citations:r.citations.map(c=>resolve(c.sourceId))})),sections:result.sections.map(s=>({...s,citations:s.citations.map(c=>resolve(c.sourceId))})),safety:result.safety.map(c=>{const ref=resolve(c.sourceId);if(ref.field!=='safety')throw new Error('검증되지 않은 안전 원문 참조입니다.');return{activityId:ref.activityId,quote:ref.quote};})};},
  }));
}
