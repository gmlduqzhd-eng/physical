// Only expose known status/categories. Provider bodies may include prompts or credentials.
export function publicAiError(error: unknown): { status: number; error: string } | null {
  let current = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const item = current as { statusCode?: number; responseBody?: string; cause?: unknown; name?: string };
    let code = '';
    if (typeof item.responseBody === 'string') { try { code = JSON.parse(item.responseBody)?.error?.code ?? ''; } catch { /* Never expose raw data. */ } }
    if (code === 'credit_balance_exhausted') return { status: 402, error: 'OpenAI API 크레딧 잔액이 없습니다. OpenAI 결제 설정에서 크레딧을 확인한 뒤 다시 시도하세요.' };
    if (['organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded', 'insufficient_quota'].includes(code)) return { status: 429, error: 'OpenAI API 사용 한도에 도달했습니다. 계정의 사용량과 프로젝트 한도를 확인하세요.' };
    if (item.statusCode === 401 || item.statusCode === 403) return { status: 502, error: 'OpenAI API 키 또는 Responses 쓰기 권한을 확인하세요. 키가 만료되었거나 폐기되었을 수도 있습니다.' };
    if (item.statusCode === 429) return { status: 429, error: 'OpenAI API 요청 한도에 도달했습니다. 계정의 사용 가능 잔액과 요청 한도를 확인하고 잠시 후 다시 시도하세요.' };
    if (item.statusCode === 404) return { status: 502, error: '설정한 OpenAI 모델을 사용할 수 없습니다. 프로젝트의 모델 접근 권한을 확인하세요.' };
    if (item.statusCode && item.statusCode >= 500) return { status: 502, error: 'OpenAI 서비스가 일시적으로 응답하지 못했습니다. 잠시 후 다시 시도하세요.' };
    if (item.name === 'TimeoutError' || item.name === 'AbortError') return { status: 504, error: 'AI 생성 시간이 초과되었습니다. 조건을 확인하고 다시 시도하세요.' };
    current = item.cause;
  }
  return null;
}
