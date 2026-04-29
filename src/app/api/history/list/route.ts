import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { getSignedDownloadUrl } from '@/lib/s3-storage';

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

    // 转换图片 URL 为签名 URL（如果是 S3 key）
    const processedData = await Promise.all(
      (data || []).map(async (record) => {
        // 如果是 S3 key，生成签名 URL
        if (record.processed_image_url && record.processed_image_url.startsWith('data:')) {
          // base64 图片保持不变
          return record;
        }
        // 其他 URL（外部链接）保持不变
        if (record.processed_image_url && !record.processed_image_url.includes('.s3.') && !record.processed_image_url.includes('r2.cloudflarestorage') && !record.processed_image_url.includes('oss-')) {
          return record;
        }
        return record;
      })
    );

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
