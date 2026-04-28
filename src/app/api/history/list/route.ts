import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取实验历史记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const client = getSupabaseClient();

    // 查询记录，按时间倒序
    const { data, error, count } = await client
      .from('experiment_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('获取实验记录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}
