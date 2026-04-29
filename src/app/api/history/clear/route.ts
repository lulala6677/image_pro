import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function DELETE() {
  try {
    const supabase = getSupabaseAdminClient();

    // 查询所有记录
    const { data, error: queryError } = await supabase
      .from('experiment_history')
      .select('id, processed_image_url');

    if (queryError) {
      console.error('查询历史记录失败:', queryError);
      return NextResponse.json(
        { success: false, error: `查询失败: ${queryError.message}` },
        { status: 500 }
      );
    }

    // 删除所有记录
    const { error: deleteError } = await supabase
      .from('experiment_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

    if (deleteError) {
      console.error('删除历史记录失败:', deleteError);
      return NextResponse.json(
        { success: false, error: `删除失败: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // TODO: 如果图片存储在 S3，也应该删除这些文件
    // 目前保留图片，因为可能其他地方还在使用

    return NextResponse.json({
      success: true,
      message: '历史记录已清空',
      deleted_count: data?.length || 0,
    });
  } catch (error) {
    console.error('清空历史记录错误:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
