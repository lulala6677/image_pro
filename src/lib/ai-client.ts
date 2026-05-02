// AI 图像生成客户端
// 支持 OpenAI DALL-E、阿里云通义万相等兼容 API

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
 * AI 图像生成
 * 支持 OpenAI DALL-E、阿里云通义万相等兼容 API
 */
export async function generateImage(
  prompt: string,
  options: {
    size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    image?: string; // 参考图片（base64 或 URL）
  } = {}
): Promise<AIImageGenerationResult> {
  checkConfig();

  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'dall-e-3';

  try {
    // 根据 API 类型选择请求格式
    const isViduApi = baseURL.includes('vidu') || baseURL.includes('maolaoapi');
    
    let body: Record<string, unknown>;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (isViduApi) {
      // maolaoapi 等兼容 API 使用 OpenAI 格式
      body = {
        model,
        prompt,
        image_url: options.image || undefined,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: 1,
      };
    } else {
      // 标准 OpenAI DALL-E API
      body = {
        model,
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: 1,
      };
      
      // DALL-E 3 图像编辑支持
      if (options.image) {
        (body as Record<string, unknown>).image = options.image;
      }
    }

    // 过滤掉 undefined 值
    const cleanBody: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        cleanBody[key] = value as string | number;
      }
    }

    // 调用 OpenAI 兼容 API
    const response = await fetch(`${baseURL}/images/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ url?: string; revised_prompt?: string }> };

    if (!data.data || data.data.length === 0) {
      throw new Error('AI 图像生成失败：未返回结果');
    }

    return {
      url: data.data[0].url || '',
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error('AI 图像生成错误:', error);
    throw error;
  }
}

/**
 * AI 图像编辑（修改图片局部）
 */
export async function editImage(
  image: string, // 原图 base64
  mask: string, // 蒙版 base64
  prompt: string,
  options: {
    model?: string;
    size?: '1024x1024' | '512x512';
  } = {}
): Promise<AIImageGenerationResult> {
  checkConfig();

  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = options.model || process.env.OPENAI_MODEL || 'dall-e-2';

  try {
    const response = await fetch(`${baseURL}/images/edits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('model', model);
        formData.append('image', image.split(',')[1] || image);
        formData.append('mask', mask.split(',')[1] || mask);
        formData.append('prompt', prompt);
        formData.append('n', '1');
        formData.append('size', options.size || '1024x1024');
        return formData;
      })(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ url?: string; revised_prompt?: string }> };

    if (!data.data || data.data.length === 0) {
      throw new Error('AI 图像编辑失败：未返回结果');
    }

    return {
      url: data.data[0].url || '',
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error('AI 图像编辑错误:', error);
    throw error;
  }
}

/**
 * AI 图像变体（生成图片变体）
 */
export async function createImageVariation(
  image: string, // 原图 base64
  options: {
    model?: string;
    size?: '1024x1024' | '512x512';
  } = {}
): Promise<AIImageGenerationResult> {
  checkConfig();

  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = options.model || process.env.OPENAI_MODEL || 'dall-e-2';

  try {
    const response = await fetch(`${baseURL}/images/variations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('model', model);
        formData.append('image', image.split(',')[1] || image);
        formData.append('n', '1');
        formData.append('size', options.size || '1024x1024');
        return formData;
      })(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ url?: string }> };

    if (!data.data || data.data.length === 0) {
      throw new Error('AI 图像变体失败：未返回结果');
    }

    return {
      url: data.data[0].url || '',
    };
  } catch (error) {
    console.error('AI 图像变体错误:', error);
    throw error;
  }
}
