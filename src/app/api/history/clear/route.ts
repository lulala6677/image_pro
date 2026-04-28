import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 清空实验历史记录
export async function DELETE() {
  try {
    const client = getSupabaseClient();

    // 删除所有记录
    const { error, count } = await client
      .from('experiment_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 永远为真的条件，删除所有记录

    if (error) {
      throw new Error(`清空失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: '历史记录已清空',
      deleted_count: count || 0
    });
  } catch (error) {
    console.error('清空实验记录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '清空失败' },
      { status: 500 }
    );
  }
}
