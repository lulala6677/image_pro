import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { experimentHistory } from '@/storage/database/shared/schema';

// 保存实验历史记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      original_name,
      operation_name,
      parameters,
      processed_image_url,
      image_width,
      image_height,
      has_selection,
      selection_bounds
    } = body;

    // 参数验证
    if (!operation_name) {
      return NextResponse.json(
        { success: false, error: '操作名称不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 插入记录
    const { data, error } = await client
      .from('experiment_history')
      .insert({
        original_name: original_name || '未命名图片',
        operation_name,
        parameters: parameters || {},
        processed_image_url,
        image_width,
        image_height,
        has_selection: has_selection || false,
        selection_bounds
      })
      .select()
      .single();

    if (error) {
      throw new Error(`保存失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: '记录保存成功'
    });
  } catch (error) {
    console.error('保存实验记录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}
