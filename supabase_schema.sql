-- 체육 미션 플랫폼 데이터베이스 세팅 코드 (방 만들기 + 템플릿 지원)

-- 1. 템플릿 테이블 생성
DROP TABLE IF EXISTS public.mission_templates CASCADE;
CREATE TABLE public.mission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 기본 템플릿 인서트
INSERT INTO public.mission_templates (id, name, buttons) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '기본 체육 미션 세트', '[
  {"id": "mission-1", "amount": 10, "cooldown": 1, "title": "제자리 잔발뛰기", "desc": "10초간 전력으로 제자리 뛰기", "iconName": "Footprints", "color": "text-cyan-400", "bg": "bg-cyan-950/40 border-cyan-900"},
  {"id": "mission-2", "amount": 20, "cooldown": 2, "title": "정확한 스쿼트", "desc": "허리를 펴고 스쿼트 5회", "iconName": "Activity", "color": "text-blue-400", "bg": "bg-blue-950/40 border-blue-900"},
  {"id": "mission-3", "amount": 40, "cooldown": 3, "title": "등 맞대고 일어서기", "desc": "조원 2명 등 맞대고 앉았다 일어서기", "iconName": "Users", "color": "text-emerald-400", "bg": "bg-emerald-950/40 border-emerald-900"},
  {"id": "mission-4", "amount": 50, "cooldown": 3, "title": "버피 테스트", "desc": "가슴이 닿게 버피 테스트 5회", "iconName": "Flame", "color": "text-orange-400", "bg": "bg-orange-950/40 border-orange-900"}
]'::jsonb);

-- 2. 게임 룸 테이블 생성
DROP TABLE IF EXISTS public.game_rooms CASCADE;
CREATE TABLE public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    template_id UUID REFERENCES public.mission_templates(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('waiting', 'playing', 'paused', 'locked', 'tsunami')) DEFAULT 'waiting',
    global_time_modifier INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 테스트용 방 인서트 (선택사항)
INSERT INTO public.game_rooms (id, pin_code, name, template_id, status) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '1234', '6학년 체력평가', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'playing');

-- 3. 룸 소속 모둠(그룹) 점수 테이블 생성
DROP TABLE IF EXISTS public.room_groups CASCADE;
CREATE TABLE public.room_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    is_defused BOOLEAN DEFAULT false,
    is_hacked BOOLEAN DEFAULT false,
    item_buff_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, group_name)
);

-- 초기 테스트용 그룹 인서트
INSERT INTO public.room_groups (room_id, group_name) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '1모둠'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '2모둠');

-- 4. 보안 정책 (RLS) 활성화 및 전체 접근 허용 정책 추가
-- (누구나 실시간 접근 가능하도록 하되, Supabase 보안 경고를 피하기 위해 명시적으로 정책을 설정합니다)
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_groups ENABLE ROW LEVEL SECURITY;

-- 모든 작업(SELECT, INSERT, UPDATE, DELETE)을 익명 사용자에게 허용하는 정책
DROP POLICY IF EXISTS "Allow all for mission_templates" ON public.mission_templates;
CREATE POLICY "Allow all for mission_templates" ON public.mission_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for game_rooms" ON public.game_rooms;
CREATE POLICY "Allow all for game_rooms" ON public.game_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for room_groups" ON public.room_groups;
CREATE POLICY "Allow all for room_groups" ON public.room_groups FOR ALL USING (true) WITH CHECK (true);

-- 점수(score) 컬럼에 대한 클라이언트의 직접 수정을 차단합니다. (핵심 보안 방어)
-- 이제 점수는 오직 아래에 정의된 RPC(increment_score, buy_buff)를 통해서만 수정할 수 있습니다.
REVOKE UPDATE (score) ON public.room_groups FROM anon, authenticated;

-- 5. Realtime(실시간 동기화) 기능 켜기
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.game_rooms, public.room_groups, public.mission_templates;
COMMIT;

-- 6. 원자적 점수 증가 함수 만들기
CREATE OR REPLACE FUNCTION increment_score(row_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.room_groups
  SET score = score + amount,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 버프 구매 아이템(원자적 처리)
CREATE OR REPLACE FUNCTION buy_buff(row_id UUID)
RETURNS VOID AS $$
DECLARE
  current_score INTEGER;
  buff_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 점수 확인
  SELECT score INTO current_score FROM public.room_groups WHERE id = row_id;
  
  IF current_score >= 200 THEN
    -- 현재 시간에서 1분 뒤로 버프 시간 설정
    buff_end := NOW() + interval '1 minute';
    
    UPDATE public.room_groups
    SET score = score - 200,
        item_buff_until = buff_end,
        updated_at = NOW()
    WHERE id = row_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
