import { createClient } from '@supabase/supabase-js';

// 빈 문자열이 들어가면 createClient가 아예 에러를 던져서 앱이 뻗습니다.
// 임시 올바른 URL 형태를 넣어 앱 크래시를 방지합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
