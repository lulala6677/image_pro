// AI 图像生成客户端
// 支持 SiliconFlow API（兼容 OpenAI 格式）

export interface AIImageGenerationResult {
  url: string;
  revisedPrompt?: string;
}

// 检查环境变量
function checkConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('缺少 AI 配置: OPENAI_API_KEY');
  }
}

/**
 * SiliconFlow 图像生成
 * 支持 Kolors (文生图) 和 Qwen-Image-Edit (图生图/风格迁移)
 */
export async function generateImage(
  prompt: string,
  options: {
    size?: string; // SiliconFlow 格式，如 "1024x1024"
    image?: string; // 参考图片（base64 或 URL）
    image2?: string; // 第二张参考图片（用于 Qwen-Image-Edit-2509）
    model?: string; // 默认使用 Kolors
  } = {}
): Promise<AIImageGenerationResult> {
  checkConfig();

  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURL = process.env.OPENAI_API_BASE || 'https://api.siliconflow.cn';
  const model = options.model || process.env.OPENAI_MODEL || 'Kwai-Kolors/Kolors';

  try {
    // SiliconFlow 使用 JSON 格式
    const requestBody: Record<string, unknown> = {
      model: model,
      prompt: prompt,
      image_size: options.size || '1024x1024',
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
    };

    // 如果有参考图片，添加到请求中
    if (options.image) {
      // SiliconFlow 支持 base64 或 URL
      requestBody.image = options.image;
    }

    // 如果有第二张图片（用于 Qwen-Image-Edit-2509）
    if (options.image2) {
      requestBody.image2 = options.image2;
    }

    console.log('[AI Client] 发送请求到 SiliconFlow:', { model, baseURL, hasImage: !!options.image });

    const response = await fetch(`${baseURL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(180000), // 3分钟超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Client] API 错误:', response.status, errorText);
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AI Client] API 响应:', JSON.stringify(data).substring(0, 500));

    // SiliconFlow 返回格式: { images: [{ url: "..." }], timings: {...}, seed: ... }
    if (data.images && data.images.length > 0) {
      return {
        url: data.images[0].url,
        revisedPrompt: prompt, // SiliconFlow 不返回 revised_prompt
      };
    }

    throw new Error('API 响应格式错误：没有找到生成的图片');
  } catch (error) {
    console.error('[AI Client] 生成失败:', error);
    throw error;
  }
}

/**
 * 风格迁移 - 使用 Qwen-Image-Edit-2509 模型
 */
export async function styleTransfer(
  sourceImage: string, // 原图 base64
  styleImage: string, // 风格参考图 base64
  prompt: string
): Promise<AIImageGenerationResult> {
  return generateImage(prompt, {
    image: sourceImage,
    image2: styleImage,
    model: 'Qwen/Qwen-Image-Edit-2509',
    size: '1024x1024',
  });
}

/**
 * 图像编辑 - 使用 Qwen-Image-Edit 模型
 */
export async function editImage(
  image: string, // 原图 base64
  prompt: string,
  size?: string
): Promise<AIImageGenerationResult> {
  return generateImage(prompt, {
    image: image,
    model: 'Qwen/Qwen-Image-Edit',
    size: size || '1024x1024',
  });
}
