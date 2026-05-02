// AI 图像生成客户端
// 支持 OpenAI DALL-E、GPT Image 等兼容 API

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

// 将 base64 转换为 Blob
function base64ToBlob(base64: string, mimeType = 'image/png'): Blob {
  // 移除 data URL 前缀
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * AI 图像生成
 * 支持 OpenAI DALL-E、GPT Image 等兼容 API
 */
export async function generateImage(
  prompt: string,
  options: {
    size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    image?: string; // 参考图片（base64）
  } = {}
): Promise<AIImageGenerationResult> {
  checkConfig();

  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'dall-e-3';

  try {
    // 检测是否为需要 multipart 格式的 API
    const isMultipartApi = baseURL.includes('maolaoapi') || 
                           baseURL.includes('vidu') ||
                           baseURL.includes('openai-image');

    let response: Response;

    if (isMultipartApi && options.image) {
      // 需要使用 multipart/form-data 格式上传图片
      // 将 base64 转换为 Blob
      const imageBlob = base64ToBlob(options.image);
      const fileName = `image_${Date.now()}.png`;

      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('image', imageBlob, fileName);
      formData.append('n', '1');
      formData.append('size', options.size || '1024x1024');
      if (options.quality) {
        formData.append('quality', options.quality);
      }

      response = await fetch(`${baseURL}/images/edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      // 标准 JSON 格式
      const body: Record<string, unknown> = {
        model,
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: 1,
      };

      response = await fetch(`${baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      let errorMessage = `API 请求失败: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
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
    // 检测是否为需要 multipart 格式的 API
    const isMultipartApi = baseURL.includes('maolaoapi') || 
                           baseURL.includes('vidu') ||
                           baseURL.includes('openai-image');

    let response: Response;

    if (isMultipartApi) {
      // 使用 multipart/form-data 格式，将 base64 转换为 Blob
      const imageBlob = base64ToBlob(image);
      const maskBlob = base64ToBlob(mask);
      const imageFileName = `image_${Date.now()}.png`;
      const maskFileName = `mask_${Date.now()}.png`;

      const formData = new FormData();
      formData.append('model', model);
      formData.append('image', imageBlob, imageFileName);
      formData.append('mask', maskBlob, maskFileName);
      formData.append('prompt', prompt);
      formData.append('n', '1');
      formData.append('size', options.size || '1024x1024');

      response = await fetch(`${baseURL}/images/edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      // 标准 OpenAI 格式
      response = await fetch(`${baseURL}/images/edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          image,
          mask,
          prompt,
          n: 1,
          size: options.size || '1024x1024',
        }),
      });
    }

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
    // 检测是否为需要 multipart 格式的 API
    const isMultipartApi = baseURL.includes('maolaoapi') || 
                           baseURL.includes('vidu') ||
                           baseURL.includes('openai-image');

    let response: Response;

    if (isMultipartApi) {
      // 使用 multipart/form-data 格式，将 base64 转换为 Blob
      const imageBlob = base64ToBlob(image);
      const imageFileName = `image_${Date.now()}.png`;

      const formData = new FormData();
      formData.append('model', model);
      formData.append('image', imageBlob, imageFileName);
      formData.append('n', '1');
      formData.append('size', options.size || '1024x1024');

      response = await fetch(`${baseURL}/images/variations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      // 标准 OpenAI 格式
      response = await fetch(`${baseURL}/images/variations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          image,
          n: 1,
          size: options.size || '1024x1024',
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ url?: string; revised_prompt?: string }> };

    if (!data.data || data.data.length === 0) {
      throw new Error('AI 图像变体生成失败：未返回结果');
    }

    return {
      url: data.data[0].url || '',
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error('AI 图像变体错误:', error);
    throw error;
  }
}
