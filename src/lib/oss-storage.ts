/**
 * 阿里云 OSS 存储客户端
 * 用于上传和访问图片文件
 */

import OSS from 'ali-oss';

// OSS 客户端实例
let client: OSS | null = null;

/**
 * 初始化 OSS 客户端
 */
export function getOSSClient(): OSS {
  if (client) {
    return client;
  }

  const region = process.env.OSS_REGION || 'oss-cn-beijing';
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;

  if (!accessKeyId || !accessKeySecret || !bucket) {
    throw new Error('缺少 OSS 配置: OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET_NAME');
  }

  client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    // 只有配置了有效的 CDN 域名才启用 cname 模式
    cname: process.env.OSS_CDN_URL ? process.env.OSS_CDN_URL : undefined,
  });

  return client;
}

/**
 * 上传图片到 OSS
 * @param buffer - 图片数据
 * @param filename - 文件名
 * @returns 图片的公开访问 URL
 */
export async function uploadImageToOSS(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ossClient = getOSSClient();
  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION || 'oss-cn-hangzhou';

  // 生成唯一的文件名
  const key = `history/${Date.now()}-${filename}`;

  try {
    // 上传文件
    const result = await ossClient.put(key, buffer);

    // 返回 CDN URL（如果配置了）或 OSS URL
    if (process.env.OSS_CDN_URL) {
      return `${process.env.OSS_CDN_URL.replace(/\/$/, '')}/${key}`;
    }

    // 如果没有配置 CDN，使用标准 OSS URL
    return `https://${bucket}.${region}.aliyuncs.com/${key}`;
  } catch (error) {
    console.error('OSS 上传失败:', error);
    throw new Error(`图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 获取签名 URL（用于私有桶访问）
 * @param key - 文件路径
 * @param expires - 过期时间（秒），默认 3600（1小时）
 */
export async function getSignedUrl(key: string, expires: number = 3600): Promise<string> {
  const ossClient = getOSSClient();

  try {
    const url = await ossClient.signatureUrl(key, { expires });
    return url;
  } catch (error) {
    console.error('获取签名 URL 失败:', error);
    throw new Error(`获取图片链接失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(key: string): Promise<boolean> {
  const ossClient = getOSSClient();

  try {
    await ossClient.head(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<void> {
  const ossClient = getOSSClient();

  try {
    await ossClient.delete(key);
  } catch (error) {
    console.error('删除文件失败:', error);
  }
}
