import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'imageUrl is required' 
      }, { status: 400 });
    }

    // 使用 coze-coding-dev-sdk 的 fetch 客户端获取图片
    const { FetchClient, Config } = await import('coze-coding-dev-sdk');
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(imageUrl);

    if (response.status_code !== 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch image',
        status: response.status_code
      }, { status: 500 });
    }

    // 提取图片数据
    const imageData = response.content.find(item => item.type === 'image');
    if (imageData && imageData.url) {
      return NextResponse.json({ 
        success: true, 
        imageUrl: imageData.url
      });
    }

    // 如果没有图片 URL，返回原始响应
    return NextResponse.json({ 
      success: true, 
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch image'
    }, { status: 500 });
  }
}
