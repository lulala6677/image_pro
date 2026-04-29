import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseAdminClient();

    // 查询历史记录
    const { data, error, count } = await supabase
      .from('experiment_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('查询历史记录失败:', error);
      return NextResponse.json(
        { success: false, error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }

    // 处理图片 URL（OSS 默认公开访问，无需签名）
    const processedData = (data || []).map((record) => {
      // base64 图片保持不变
      if (record.processed_image_url?.startsWith('data:')) {
        return record;
      }
      // 其他 URL（OSS URL 或外部链接）保持不变
      // 阿里云 OSS 的 URL 通常包含 .aliyuncs.com 或自定义域名
      return record;
    });

    return NextResponse.json({
      success: true,
      data: processedData,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('查询历史记录错误:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
