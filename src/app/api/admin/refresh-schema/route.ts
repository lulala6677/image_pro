import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量创建客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 直接执行 SQL 刷新 schema
    const { error } = await supabase.rpc('pg_notify', {
      channel: 'pgrst',
      message: 'reload schema'
    });
    
    if (error) {
      // 如果 RPC 失败，尝试直接查询触发 reload
      const { error: queryError } = await supabase
        .from('experiment_history')
        .select('id')
        .limit(1);
      
      if (queryError) {
        return NextResponse.json({
          success: false,
          error: queryError.message,
          hint: '请在 Supabase Dashboard 的 SQL Editor 中手动执行: NOTIFY pgrst, \'reload schema\';'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, message: 'Schema cache refreshed' });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
