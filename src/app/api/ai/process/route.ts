import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import axios from 'axios';

// 扩图方向配置
interface ExpandConfig {
  expandLeft: number;
  expandRight: number;
  expandTop: number;
  expandBottom: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, imageUrl, styleImageUrl, prompt, maskImageUrl, expandConfig } = body;

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    switch (action) {
      case 'denoise': {
        // 图像去噪 - 强调保持原图内容不变
        const denoisePrompt = prompt || 
          `Professional image denoising and restoration. Remove all noise, grain, and artifacts. ` +
          `CRITICAL: Preserve the original content, subject, composition, colors, and ALL details exactly. ` +
          `Enhance clarity and sharpness while maintaining pixel-perfect fidelity to the original. ` +
          `Output must be a denoised version with IDENTICAL content.`;
        
        const response = await client.generate({
          prompt: denoisePrompt,
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
        // 真正的扩图功能 - Canvas + AI 填充
        // 支持指定扩展方向和大小
        
        const expConfig: ExpandConfig = expandConfig || {
          expandLeft: 200,
          expandRight: 200,
          expandTop: 100,
          expandBottom: 100
        };

        // 1. 下载原图
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const originalImageBuffer = Buffer.from(imageResponse.data);
        
        // 2. 获取原图尺寸
        const { width: origWidth, height: origHeight } = await getImageDimensions(originalImageBuffer);
        
        // 3. 计算新画布尺寸
        const newWidth = origWidth + expConfig.expandLeft + expConfig.expandRight;
        const newHeight = origHeight + expConfig.expandTop + expConfig.expandBottom;
        
        // 4. 创建扩展后的画布
        const expandedImageBuffer = await createExpandedCanvas(
          originalImageBuffer,
          origWidth,
          origHeight,
          expConfig
        );

        // 5. 使用 AI 填充扩展区域
        // 将扩展后的图片转为 base64 发送
        const expandedBase64 = expandedImageBuffer.toString('base64');
        const expandedDataUrl = `data:image/png;base64,${expandedBase64}`;
        
        // 扩图 prompt - 强调只填充边缘区域，无边框
        const expandPrompt = prompt || 
          `Outpainting: Extend this image seamlessly at all edges. ` +
          `CRITICAL INSTRUCTIONS: ` +
          `1. The original content in the image must remain EXACTLY the same - do not modify it ` +
          `2. The transparent or blank areas at the edges need to be filled with natural content ` +
          `3. There must be NO VISIBLE BORDER or line between original and new content ` +
          `4. Create completely seamless transitions at all boundaries ` +
          `5. New content must perfectly match the style, lighting, colors, textures, and composition ` +
          `6. The final image should look like it was originally captured at this wider size ` +
          `7. Fill every pixel of the expanded areas naturally`;

        const response = await client.generate({
          prompt: expandPrompt,
          image: expandedDataUrl,
          size: `${newWidth}x${newHeight}`,
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            originalWidth: origWidth,
            originalHeight: origHeight,
            newWidth,
            newHeight,
            message: '扩图完成'
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      case 'expand-direction': {
        // 按方向扩图 - 上/下/左/右
        const { direction, amount } = body;
        const expandAmount = amount || 300;
        
        // 下载原图
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const originalImageBuffer = Buffer.from(imageResponse.data);
        
        const { width: origWidth, height: origHeight } = await getImageDimensions(originalImageBuffer);
        
        // 根据方向计算扩展配置
        let expConfig: ExpandConfig = {
          expandLeft: 0,
          expandRight: 0,
          expandTop: 0,
          expandBottom: 0
        };
        
        switch (direction) {
          case 'left':
            expConfig.expandLeft = expandAmount;
            break;
          case 'right':
            expConfig.expandRight = expandAmount;
            break;
          case 'top':
            expConfig.expandTop = expandAmount;
            break;
          case 'bottom':
            expConfig.expandBottom = expandAmount;
            break;
          case 'all':
          default:
            expConfig = {
              expandLeft: expandAmount,
              expandRight: expandAmount,
              expandTop: Math.round(expandAmount / 2),
              expandBottom: Math.round(expandAmount / 2)
            };
        }
        
        // 创建扩展画布
        const expandedImageBuffer = await createExpandedCanvas(
          originalImageBuffer,
          origWidth,
          origHeight,
          expConfig
        );
        
        const newWidth = origWidth + expConfig.expandLeft + expConfig.expandRight;
        const newHeight = origHeight + expConfig.expandTop + expConfig.expandBottom;
        const expandedBase64 = expandedImageBuffer.toString('base64');
        const expandedDataUrl = `data:image/png;base64,${expandedBase64}`;
        
        // 根据扩展方向调整 prompt
        const directionNames: Record<string, string> = {
          left: 'left side',
          right: 'right side',
          top: 'top and upper area',
          bottom: 'bottom and lower area',
          all: 'all edges and corners'
        };
        
        const expandPrompt = prompt || 
          `Outpainting: Seamlessly extend the image at the ${directionNames[direction] || 'edges'}. ` +
          `CRITICAL: ` +
          `1. The ORIGINAL CONTENT in the center must stay EXACTLY the same ` +
          `2. NO VISIBLE BORDER or line between original and new content ` +
          `3. Create perfectly seamless transitions at the boundaries ` +
          `4. Fill the expanded areas naturally to match style, colors, lighting, and composition ` +
          `5. The final result should look like it was originally captured at this size`;

        const response = await client.generate({
          prompt: expandPrompt,
          image: expandedDataUrl,
          size: `${newWidth}x${newHeight}`,
        });

        const helper = client.getResponseHelper(response);
        if (helper.success) {
          return NextResponse.json({ 
            success: true, 
            imageUrl: helper.imageUrls[0],
            direction,
            message: `${directionNames[direction]}扩图完成`
          });
        }
        return NextResponse.json({ 
          success: false, 
          errors: helper.errorMessages 
        }, { status: 500 });
      }

      case 'style_transfer': {
        // 风格迁移 - 强调保持原图内容
        if (!styleImageUrl) {
          return NextResponse.json({ 
            success: false, 
            error: '请上传风格参考图' 
          }, { status: 400 });
        }

        const stylePrompt = prompt || 
          `Artistic style transfer. Apply the artistic style from the second image to the first image. ` +
          `CRITICAL: The FIRST image's content, subject, composition, and main elements must remain ` +
          `COMPLETELY UNCHANGED. Only transfer the visual art style (colors, textures, brush strokes, ` +
          `lighting mood) from the second image. The output should look like the SAME CONTENT ` +
          `rendered in the new artistic style. Do not change WHAT is depicted, only HOW it looks.`;
        
        const response = await client.generate({
          prompt: stylePrompt,
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
        if (!maskImageUrl) {
          return NextResponse.json({ 
            success: false, 
            error: '内容填充需要先使用选区工具选择区域'
          }, { status: 400 });
        }

        const inpaintPrompt = prompt || 
          `Intelligent content-aware inpainting. ` +
          `The masked areas should be seamlessly filled with natural content ` +
          `matching the surrounding context in style, lighting, colors, and texture. ` +
          `The unmasked original content must remain completely unchanged.`;
        
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
        // 图像增强
        const enhancePrompt = prompt || 
          `Professional image enhancement. ` +
          `CRITICAL: Preserve original content, composition, and subject exactly. ` +
          `Only enhance quality, clarity, details, colors, and visual appeal.`;
        
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

// 获取图片尺寸
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  // PNG 文件头
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  
  // JPEG 文件头
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }
  
  // 默认尺寸（如果无法解析）
  return { width: 1024, height: 1024 };
}

// 创建扩展画布 - 使用纯 Node.js 实现
async function createExpandedCanvas(
  originalBuffer: Buffer,
  origWidth: number,
  origHeight: number,
  config: ExpandConfig
): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    
    const newWidth = origWidth + config.expandLeft + config.expandRight;
    const newHeight = origHeight + config.expandTop + config.expandBottom;
    
    // 计算原图在新画布中的位置
    const left = config.expandLeft;
    const top = config.expandTop;
    
    // 获取原图边缘的像素颜色用于填充扩展区域
    // 提取原图边缘的一列/一行像素
    const originalImage = sharp(originalBuffer);
    const metadata = await originalImage.metadata();
    
    // 使用镜像填充来创建自然的边缘扩展
    // 先将原图放在灰色背景上，然后让 AI 填充
    const expandedBuffer = await sharp({
      create: {
        width: newWidth,
        height: newHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }  // 使用透明背景
      }
    })
    .composite([
      {
        input: originalBuffer,
        left: left,
        top: top,
        blend: 'over'
      }
    ])
    .ensureAlpha()
    .png()
    .toBuffer();
    
    return expandedBuffer;
  } catch (error) {
    console.error('Sharp processing error:', error);
    throw error;
  }
}
