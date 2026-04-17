import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 初始化客户端（复用实例）
let cachedClient: ImageGenerationClient | null = null;

function getClient(customHeaders: Record<string, string>) {
  if (!cachedClient) {
    const config = new Config();
    cachedClient = new ImageGenerationClient(config, customHeaders);
  }
  return cachedClient;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, imageUrl, styleImageUrl, prompt, maskImageUrl, strength } = body;

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = getClient(customHeaders);

    // 强度参数（控制对原图的保留程度，0-1之间）
    const controlStrength = strength !== undefined ? Number(strength) : 0.7;

    switch (action) {
      case 'denoise': {
        // 图像去噪 - 使用 AI 增强清晰度
        // 强调保持原图内容和结构不变，只去除噪点
        const denoisePrompt = prompt || 
          `Professional image denoising and restoration. Remove all noise, grain, and artifacts. ` +
          `IMPORTANT: Preserve the original content, subject, composition, colors, and all details exactly. ` +
          `Enhance clarity and sharpness while maintaining perfect fidelity to the original image. ` +
          `The output must be a denoised version of the input image with identical content.`;
        
        const response = await client.generate({
          prompt: denoisePrompt,
          image: imageUrl,
          size: '2K',
          // 较高的 strength 意味着更接近原图
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
        // 扩展倍数，默认为 1.5（扩大 50%）
        const scale = body.scale !== undefined ? Number(body.scale) : 1.5;
        const padding = body.padding !== undefined ? Number(body.padding) : 50;
        
        // 返回给前端进行 Canvas 扩展处理
        return NextResponse.json({ 
          success: true, 
          action: 'expand_canvas',
          imageUrl: imageUrl,
          scale: scale,
          padding: padding,
          message: '准备扩展画布'
        });
      }

      case 'style_transfer': {
        // 风格迁移
        if (!styleImageUrl) {
          return NextResponse.json({ 
            success: false, 
            error: '请上传风格参考图' 
          }, { status: 400 });
        }

        // 风格迁移的 prompt - 明确强调保持原图内容
        const stylePrompt = prompt || 
          `Apply the artistic style from the second image to the first image. ` +
          `IMPORTANT: The subject, content, composition, and main elements of the first image ` +
          `must remain completely unchanged - only the visual style should be transformed. ` +
          `Transfer colors, textures, brush strokes, and artistic effects from the style reference. ` +
          `The output should look like the original content rendered in the new art style. ` +
          `Do not change what is depicted, only how it is depicted.`;
        
        const response = await client.generate({
          prompt: stylePrompt,
          // 第一张是原图，第二张是风格参考
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
        // 内容感知填充 (Inpainting)
        // 如果有蒙版图，使用蒙版；否则尝试根据提示词去除内容
        if (!maskImageUrl) {
          // 如果没有蒙版，提供一个友好的提示
          return NextResponse.json({ 
            success: false, 
            error: '内容填充需要先使用选区工具（如魔棒、套索）选择要填充的区域'
          }, { status: 400 });
        }

        // Inpainting prompt - 明确说明要填充的区域应该被自然替代
        const inpaintPrompt = prompt || 
          `Intelligent content-aware inpainting. ` +
          `The masked areas should be seamlessly filled with natural content ` +
          `that matches the surrounding context in style, lighting, colors, and texture. ` +
          `The unmasked original content must remain completely unchanged. ` +
          `Create smooth, realistic fills that are indistinguishable from the original image.`;
        
        const response = await client.generate({
          prompt: inpaintPrompt,
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

      case 'enhance': {
        // 图像增强 - 提升整体质量
        const enhancePrompt = prompt || 
          `Professional image enhancement and quality improvement. ` +
          `Improve clarity, details, colors, and overall visual quality. ` +
          `IMPORTANT: Preserve the original content, composition, and subject exactly. ` +
          `Only enhance the quality and visual appeal while maintaining perfect fidelity.`;
        
        const response = await client.generate({
          prompt: enhancePrompt,
          image: imageUrl,
          size: '2K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            message: '图像增强完成'
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
