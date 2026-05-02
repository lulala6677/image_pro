import { NextRequest, NextResponse } from 'next/server';
import { generateImage, editImage } from '@/lib/ai-client';
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
        // 图像去噪 - 使用 Qwen-Image-Edit 模型
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
        // 智能扩图 - 使用 Qwen-Image-Edit 模型
        message = '智能扩图完成';
        const expandPrompt = prompt ||
          `Extend and expand this image outward to create a wider view. ` +
          `IMPORTANT: Keep the original content in the center completely unchanged. ` +
          `Only generate new natural content at the edges to seamlessly expand the scene. ` +
          `Match the lighting, colors, atmosphere, textures, and perspective of the original image. ` +
          `The new expanded areas should look like a natural continuation of the original scene. ` +
          `The overall composition should look like one coherent image with a wider field of view.`;

        result = await generateImage(expandPrompt, {
          image: imageUrl,
          model: 'Qwen/Qwen-Image-Edit',
          size: '1328x1328',
        });
        break;
      }

      case 'style_transfer': {
        // 风格迁移 - 使用 Qwen-Image-Edit-2509 模型支持双图输入
        if (!styleImageUrl) {
          return NextResponse.json({
            success: false,
            error: '请上传风格参考图',
          }, { status: 400 });
        }

        message = '风格迁移完成';
        const stylePrompt = prompt ||
          `Apply the visual style of the second image to the first image. ` +
          `IMPORTANT: The subject and content of the first image must remain completely unchanged. ` +
          `Only apply the visual style, colors, textures, and artistic effects from the reference. ` +
          `The output should look like the original content rendered in the new art style. ` +
          `Do not change what is depicted, only how it is depicted.`;

        result = await generateImage(stylePrompt, {
          image: imageUrl,
          image2: styleImageUrl,
          model: 'Qwen/Qwen-Image-Edit-2509',
          size: '1024x1024',
        });
        break;
      }

      case 'inpaint': {
        // 内容感知填充 (Inpainting)
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
        // 图像增强 - 提升整体质量
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
        // 下载 AI 返回的图片
        const response = await fetch(result.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // 上传到自己的 OSS 存储
          finalImageUrl = await uploadImageToOSS(buffer, 'ai-result.png');
        }
      } catch (uploadError) {
        console.warn('上传 AI 结果到 OSS 失败，使用原始 URL:', uploadError);
        // 失败时使用原始 URL
      }
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

    // 区分错误类型
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
