declare module 'ali-oss' {
  export interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    cname?: string;
  }

  export interface PutResult {
    url: string;
    name: string;
    res: {
      status: number;
      headers: Record<string, string>;
    };
  }

  export interface SignatureUrlOptions {
    expires?: number;
  }

  export default class OSS {
    constructor(options: OSSOptions);
    put(key: string, file: Buffer | Blob): Promise<PutResult>;
    signatureUrl(key: string, options?: SignatureUrlOptions): Promise<string>;
    head(key: string): Promise<void>;
    delete(key: string): Promise<void>;
  }
}
