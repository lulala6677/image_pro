import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { uploadToS3, generateFileKey } from '@/lib/s3-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      original_name,
      operation_name,
      processed_image_url,
      image_width,
      image_height,
      has_selection = false,
      selection_bounds = null,
      parameters = null,
    } = body;

    // 验证必填字段
    if (!operation_name) {
      return NextResponse.json(
        { success: false, error: '操作名称不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    let finalImageUrl = processed_image_url;
    let imageKey: string | null = null;

    // 如果是 base64 图片数据，上传到 S3
    if (processed_image_url && processed_image_url.startsWith('data:')) {
      try {
        // 提取 base64 数据
        const match = processed_image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');

          // 生成唯一文件 key
          imageKey = generateFileKey('history', 'png');

          // 上传到 S3
          finalImageUrl = await uploadToS3(imageKey, buffer, contentType);
          console.log(`图片已上传到 S3: ${imageKey}`);
        }
      } catch (uploadError) {
        console.error('图片上传失败:', uploadError);
        return NextResponse.json(
          { success: false, error: '图片上传失败' },
          { status: 500 }
        );
      }
    }

    // 生成记录 ID
    const id = crypto.randomUUID();

    // 保存到数据库
    const { data, error } = await supabase.from('experiment_history').insert({
      id,
      original_name: original_name || null,
      operation_name,
      parameters: parameters || null,
      processed_image_url: finalImageUrl || null,
      image_width: image_width || null,
      image_height: image_height || null,
      has_selection,
      selection_bounds: selection_bounds || null,
    }).select().single();

    if (error) {
      console.error('保存历史记录失败:', error);
      return NextResponse.json(
        { success: false, error: `保存失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: '记录保存成功',
    });
  } catch (error) {
    console.error('保存历史记录错误:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
