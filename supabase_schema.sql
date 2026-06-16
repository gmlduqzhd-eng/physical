-- 폭탄 해체 작전 데이터베이스 스키마 설정

-- 1. bomb_defusal_scores 테이블 생성
CREATE TABLE IF NOT EXISTS public.bomb_defusal_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    mission_stats JSONB DEFAULT '{}'::jsonb,
    is_defused BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. game_controls 테이블 생성
CREATE TABLE IF NOT EXISTS public.game_controls (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status TEXT CHECK (status IN ('playing', 'paused', 'locked')) DEFAULT 'paused',
    global_time_modifier INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE
);

-- 3. 초기 게임 상태값 인서트 (단일 레코드)
INSERT INTO public.game_controls (id, status, global_time_modifier, started_at) 
VALUES (1, 'paused', 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. 보안 정책 (빠른 개발 및 실시간 적용을 위해 RLS 해제)
ALTER TABLE public.bomb_defusal_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_controls DISABLE ROW LEVEL SECURITY;

-- 5. Realtime 동기화 허용 설정 (Supabase 소켓)
BEGIN;
  -- publication이 이미 있을 수 있으므로 존재 여부에 따라 처리
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.bomb_defusal_scores, public.game_controls;
COMMIT;

-- 6. 원자적 연산(Atomic Update)을 위한 RPC(Stored Procedure) 생성
-- 다수의 클라이언트가 동시에 점수를 업데이트할 때 발생하는 Race Condition을 방지합니다.
CREATE OR REPLACE FUNCTION increment_score(row_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bomb_defusal_scores
  SET score = score + amount,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
