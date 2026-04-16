import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, imageUrl, styleImageUrl, prompt, strength } = body;

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化客户端
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    switch (action) {
      case 'denoise': {
        // 图像去噪 - 使用 AI 增强清晰度
        const response = await client.generate({
          prompt: prompt || 'Professional photo restoration, remove noise and artifacts, enhance clarity and details, maintain original composition',
          image: imageUrl,
          size: '2K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            message: '去噪处理完成'
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      case 'expand': {
        // 智能扩图 - 扩展图像边界
        const response = await client.generate({
          prompt: prompt || 'Seamlessly extend the image boundaries, maintain coherent scene and lighting, natural expansion',
          image: imageUrl,
          size: '2K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            message: '智能扩图完成'
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      case 'style_transfer': {
        // 风格迁移
        if (!styleImageUrl) {
          return NextResponse.json({ 
            success: false, 
            error: '请上传风格参考图' 
          }, { status: 400 });
        }

        const response = await client.generate({
          prompt: prompt || 'Apply artistic style from reference image while maintaining original content',
          image: [imageUrl, styleImageUrl],
          size: '2K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            message: '风格迁移完成'
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      case 'inpaint': {
        // 内容感知填充
        const response = await client.generate({
          prompt: prompt || 'Intelligent content-aware fill, seamlessly remove unwanted objects, reconstruct background naturally',
          image: imageUrl,
          size: '2K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            message: '内容填充完成'
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: '未知操作' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('AI 处理错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '处理失败' 
    }, { status: 500 });
  }
}
