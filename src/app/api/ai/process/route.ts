import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai-client';
import { uploadImageToOSS } from '@/lib/oss-storage';

/**
 * AI 图像处理 API
 * 支持 SiliconFlow（Kolors 文生图 / Qwen-Image-Edit 图生图）
 * 
 * 请求参数:
 * - action: 'denoise' | 'expand' | 'style_transfer' | 'inpaint' | 'enhance'
 * - imageUrl: base64 图片数据或外部 URL
 * - styleImageUrl: 风格参考图（用于风格迁移）
 * - prompt: 自定义提示词
 * - strength: 强度参数（0-1）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, imageUrl, styleImageUrl, prompt, strength } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: '缺少 action 参数',
      }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: '缺少图片数据',
      }, { status: 400 });
    }

    let result;
    let message;

    switch (action) {
      case 'denoise': {
        message = '去噪处理完成';
        const denoisePrompt = prompt ||
          `Professional image denoising and restoration. Remove all noise, grain, and artifacts. ` +
          `IMPORTANT: Preserve the original content, subject, composition, colors, and all details exactly. ` +
          `Enhance clarity and sharpness while maintaining perfect fidelity to the original image. ` +
          `The output must be a denoised version of the input image with identical content.`;

        result = await generateImage(denoisePrompt, {
          image: imageUrl,
          model: 'Qwen/Qwen-Image-Edit',
          size: '1024x1024',
        });
        break;
      }

      case 'expand': {
        message = '智能扩图完成';
        const expandPrompt = prompt ||
          `EXTEND this image naturally at the edges. ` +
          `The original content in the center must remain UNCHANGED. ` +
          `Only generate new content at the borders. ` +
          `New edges must perfectly match: lighting, colors, textures, style, atmosphere. ` +
          `The transition must be invisible - no seams, no artifacts, no style changes.`;

        result = await generateImage(expandPrompt, {
          image: imageUrl,
          model: 'Qwen/Qwen-Image-Edit',
          size: '1328x1328',
        });
        break;
      }

      case 'style_transfer': {
        if (!styleImageUrl) {
          return NextResponse.json({
            success: false,
            error: '请上传风格参考图',
          }, { status: 400 });
        }

        message = '风格迁移完成';
        // image 参数是原图（内容），image2 是风格图
        const combinedPrompt = prompt ||
          `Apply the artistic style from image2 to the content of image1. ` +
          `CONTENT (image1): Keep EXACTLY - all subjects, positions, shapes, people, objects, background. ` +
          `STYLE (image2): Extract ONLY - colors, textures, brush strokes, lighting, mood. ` +
          `RESULT: Image1 content drawn in the style of image2.`;

        result = await generateImage(combinedPrompt, {
          image: imageUrl,      // 原图 - 内容来源
          image2: styleImageUrl, // 风格图 - 风格参考
          model: 'Qwen/Qwen-Image-Edit-2509',
          size: '1024x1024',
        });
        break;
      }

      case 'inpaint': {
        message = '内容填充完成';
        const inpaintPrompt = prompt ||
          `Edit and improve this image. Regenerate any unwanted or low-quality areas with natural content. ` +
          `IMPORTANT: Keep all good areas exactly the same. ` +
          `Only modify areas that need improvement. ` +
          `The new content should match the surrounding areas in lighting, colors, and texture. ` +
          `Create a seamless, high-quality result.`;

        result = await generateImage(inpaintPrompt, {
          image: imageUrl,
          model: 'Qwen/Qwen-Image-Edit',
          size: '1024x1024',
        });
        break;
      }

      case 'enhance': {
        message = '图像增强完成';
        const enhancePrompt = prompt ||
          `Enhance and improve this image with professional photo editing. ` +
          `Adjust colors, contrast, brightness, and saturation for optimal visual impact. ` +
          `Sharpen details and improve overall clarity and quality. ` +
          `IMPORTANT: Preserve the original composition, subject, and all important details. ` +
          `Only enhance the image quality and visual appeal while maintaining authenticity.`;

        result = await generateImage(enhancePrompt, {
          image: imageUrl,
          model: 'Qwen/Qwen-Image-Edit',
          size: '1024x1024',
        });
        break;
      }

      default:
        return NextResponse.json({
          success: false,
          error: `不支持的操作: ${action}`,
        }, { status: 400 });
    }

    if (!result || !result.url) {
      return NextResponse.json({
        success: false,
        error: 'AI 处理失败：未返回结果',
      }, { status: 500 });
    }

    // 如果返回的是 URL，尝试下载并上传到自己的存储
    let finalImageUrl = result.url;

    if (result.url.startsWith('https://') && !result.url.includes('data:image')) {
      try {
        const response = await fetch(result.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          finalImageUrl = await uploadImageToOSS(buffer, `ai-${action}-${Date.now()}.png`);
        }
      } catch (uploadError) {
        console.warn('上传到 OSS 失败，使用原始 URL:', uploadError);
      }
    }

    // 保存历史记录
    try {
      const { saveHistoryRecord } = await import('@/lib/api/history-service');
      const saveResult = await saveHistoryRecord({
        original_name: imageUrl || 'AI生成图片',
        operation_name: `AI_${action}`,
        processed_image_url: finalImageUrl,
        parameters: {
          model: 'Qwen-Image-Edit',
          action: action,
          hasStyleImage: !!styleImageUrl,
        },
        image_width: 1024,
        image_height: 1024,
        has_selection: false,
        selection_bounds: null,
      });
      console.log('[AI Process] History saved:', saveResult.success ? 'OK' : saveResult.error);
    } catch (historyError) {
      console.error('[AI Process] History save failed:', historyError);
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      message,
      revisedPrompt: result.revisedPrompt,
    });

  } catch (error) {
    console.error('AI 图像处理错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    if (errorMessage.includes('API key') || errorMessage.includes('auth')) {
      return NextResponse.json({
        success: false,
        error: 'AI 服务认证失败，请检查 API 配置',
      }, { status: 401 });
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return NextResponse.json({
        success: false,
        error: 'AI 服务调用次数超限，请稍后重试',
      }, { status: 429 });
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json({
        success: false,
        error: 'AI 服务处理超时，请尝试更简单的操作或稍后重试',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: `AI处理失败: ${errorMessage}`,
    }, { status: 500 });
  }
}
