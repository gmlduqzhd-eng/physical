-- 폭탄 해체 작전 데이터베이스 세팅 코드

-- 1. 모둠 점수 테이블 생성 (에러 방지를 위해 기존 테이블이 있다면 삭제 후 재생성)
DROP TABLE IF EXISTS public.bomb_defusal_scores CASCADE;
CREATE TABLE public.bomb_defusal_scores (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    mission_stats JSONB DEFAULT '{}'::jsonb,
    is_defused BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 1~6모둠 데이터 인서트
INSERT INTO public.bomb_defusal_scores (id, class_name, group_name) VALUES
('group-1', '6학년', '1모둠'),
('group-2', '6학년', '2모둠'),
('group-3', '6학년', '3모둠'),
('group-4', '6학년', '4모둠'),
('group-5', '6학년', '5모둠'),
('group-6', '6학년', '6모둠');

-- 2. 게임 통제(타이머) 테이블 생성
DROP TABLE IF EXISTS public.game_controls CASCADE;
CREATE TABLE public.game_controls (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status TEXT CHECK (status IN ('playing', 'paused', 'locked')) DEFAULT 'paused',
    global_time_modifier INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE
);

-- 초기 게임 상태값 인서트
INSERT INTO public.game_controls (id, status, global_time_modifier, started_at) 
VALUES (1, 'paused', 0, NULL);

-- 3. 보안 정책 해제 (누구나 실시간 접근 가능하도록)
ALTER TABLE public.bomb_defusal_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_controls DISABLE ROW LEVEL SECURITY;

-- 4. Realtime(실시간 동기화) 기능 켜기
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.bomb_defusal_scores, public.game_controls;
COMMIT;

-- 5. 원자적 점수 증가 함수 만들기 (동시에 눌러도 점수 누락 방지)
CREATE OR REPLACE FUNCTION increment_score(row_id TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bomb_defusal_scores
  SET score = score + amount,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
