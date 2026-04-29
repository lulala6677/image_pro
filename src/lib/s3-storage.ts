import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// S3 配置
interface S3Config {
  endpoint: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  bucket: string;
  publicUrl: string;
}

let s3Client: S3Client | null = null;
let s3Config: S3Config | null = null;

/**
 * 初始化 S3 客户端
 */
function getS3Config(): S3Config {
  if (!s3Config) {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET_NAME;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        '缺少 S3 配置: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME'
      );
    }

    s3Config = {
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      bucket,
      publicUrl: publicUrl || endpoint,
    };
  }
  return s3Config;
}

/**
 * 获取 S3 客户端
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getS3Config();
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: config.credentials,
      // S3 兼容模式
      forcePathStyle: true,
    });
  }
  return s3Client;
}

/**
 * 上传文件到 S3
 * @param key 文件路径（如 'history/xxx.png'）
 * @param body 文件内容（Buffer 或 Uint8Array）
 * @param contentType MIME 类型
 * @returns 文件的公共访问 URL
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = 'image/png'
): Promise<string> {
  const config = getS3Config();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // 公开读取（如果存储桶配置允许）
      ACL: 'public-read',
    })
  );

  // 返回公共 URL
  return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
}

/**
 * 获取带签名的下载 URL（私有文件访问）
 * @param key 文件路径
 * @param expiresIn 签名有效期（秒），默认 3600（1小时）
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const config = getS3Config();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  // 动态导入 @aws-sdk/s3-request-presigner 并使用
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  return getSignedUrl(client as unknown as Parameters<typeof getSignedUrl>[0], command as unknown as Parameters<typeof getSignedUrl>[1], { expiresIn });
}

/**
 * 删除 S3 文件
 * @param key 文件路径
 */
export async function deleteFromS3(key: string): Promise<void> {
  const config = getS3Config();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

/**
 * 生成唯一文件 key
 * @param prefix 前缀（如 'history'）
 * @param extension 文件扩展名（如 'png'）
 */
export function generateFileKey(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${timestamp}_${random}.${extension}`;
}
