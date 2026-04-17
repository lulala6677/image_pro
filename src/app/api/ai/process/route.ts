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
        // 强调保持原图内容，只在边界处生成新内容
        const expandPrompt = prompt || 
          `Extend and expand this image outward to create a wider view. ` +
          `IMPORTANT: Keep the original content in the center completely unchanged. ` +
          `Only generate new natural content at the edges to seamlessly expand the scene. ` +
          `Match the lighting, colors, atmosphere, textures, and perspective of the original image. ` +
          `The new expanded areas should look like a natural continuation of the original scene. ` +
          `The overall composition should look like one coherent image with a wider field of view.`;
        
        const response = await client.generate({
          prompt: expandPrompt,
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
        // 预处理后的图像中选区已被均值填充
        // 使用边界信息辅助 prompt
        const { originalImageUrl, bounds } = body;
        
        // Inpainting prompt - 明确说明要填充的区域应该被自然替代
        const inpaintPrompt = prompt || 
          `This image has been pre-processed with the target area already smoothed. ` +
          `Please regenerate only the smoothed area with new natural content that seamlessly continues from the surrounding context. ` +
          `IMPORTANT: Everything outside the smoothed area must remain EXACTLY the same - do not modify any pixels outside this area. ` +
          `The new content should match the lighting, colors, textures, patterns, and perspective of the surrounding area. ` +
          `Create smooth, realistic fills that are perfectly blended with the original image. ` +
          `The result should look like the original unedited image.`;
        
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

      case 'inpaint_crop': {
        // 裁剪区域的内容填充
        // 图像已经预处理过，选区已被模糊处理
        const { originalBounds, cropBounds } = body;
        
        // 裁剪区域 Inpainting prompt
        const inpaintPrompt = prompt || 
          `This image contains a target area that needs regeneration. ` +
          `The area has been pre-processed with smoothing. ` +
          `Please generate new content only for this smoothed area. ` +
          `The new content should seamlessly blend with the surrounding pixels in terms of lighting, colors, textures, patterns, and perspective. ` +
          `IMPORTANT: Preserve everything outside the smoothed area exactly as is. ` +
          `Create a natural, seamless fill that looks like the original unedited image. ` +
          `The overall composition should be coherent and realistic.`;
        
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
