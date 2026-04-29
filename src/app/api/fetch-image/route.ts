import { NextRequest, NextResponse } from 'next/server';

/**
 * 图片获取代理 API
 * 用于解决跨域问题和获取外部图片
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'imageUrl is required',
      }, { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json({
        success: false,
        error: '无效的 URL 格式',
      }, { status: 400 });
    }

    // 限制可访问的域名（安全性考虑）
    const allowedDomains = [
      'openai.com',
      'oaidalleapiprodscus.blob.core.windows.net',
      'dalle2.azurewebsites.net',
      'dashscope.aliyuncs.com',
      'modelscope.cn',
      'tos.coze.site',
      'r2.cloudflarestorage.com',
      'amazonaws.com',
      'aliyuncs.com',
      'oss-cn-',
    ];

    const url = new URL(imageUrl);
    const isAllowed = allowedDomains.some(domain =>
      url.hostname.includes(domain) || url.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      return NextResponse.json({
        success: false,
        error: '不允许访问该域名',
      }, { status: 403 });
    }

    // 获取图片
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(30000), // 30 秒超时
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `获取图片失败: ${response.status} ${response.statusText}`,
      }, { status: response.status });
    }

    // 获取内容类型
    const contentType = response.headers.get('content-type') || 'image/png';

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 返回 base64 编码的图片
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      contentType,
      size: buffer.length,
    });

  } catch (error) {
    console.error('图片获取错误:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: '获取图片超时',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取图片失败',
    }, { status: 500 });
  }
}
