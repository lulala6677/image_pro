import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化存储客户端（使用环境变量）
const getStorage = () => {
  return new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    bucketName: process.env.COZE_BUCKET_NAME,
  });
};

// 将 base64 数据转换为 Buffer
export function base64ToBuffer(base64: string): { buffer: Buffer; contentType: string } | null {
  try {
    // 匹配 data:image/png;base64,iVBORw0KGgo... 格式
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      return { buffer, contentType };
    }
    return null;
  } catch {
    return null;
  }
}

// 上传图片到对象存储并返回 key
export async function uploadImageToStorage(dataUrl: string): Promise<string | null> {
  try {
    const result = base64ToBuffer(dataUrl);
    if (!result) {
      return null;
    }

    const { buffer, contentType } = result;
    const storage = getStorage();

    // 生成唯一文件名
    const fileName = `history/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.png`;

    // 上传文件
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: contentType,
    });

    return key;
  } catch (error) {
    console.error('上传图片失败:', error);
    return null;
  }
}

// 生成图片访问 URL
export async function getImageUrl(key: string): Promise<string> {
  try {
    const storage = getStorage();
    // 生成 30 天有效的签名 URL
    const url = await storage.generatePresignedUrl({
      key: key,
      expireTime: 30 * 24 * 60 * 60, // 30 天
    });
    return url;
  } catch (error) {
    console.error('生成图片 URL 失败:', error);
    return '';
  }
}
