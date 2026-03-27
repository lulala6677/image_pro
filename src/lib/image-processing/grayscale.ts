// 灰度变换处理函数

import type { GammaParams, LinearTransformParams, ProcessImageData } from './types';

/**
 * 辅助函数：创建带图片的 canvas
 */
function createCanvasWithImage(dataUrl: string, width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imgData: ImageData } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  // 填充白色背景，防止透明区域显示异常
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  const img = new Image();
  img.src = dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  
  const imgData = ctx.getImageData(0, 0, width, height);
  
  return { canvas, ctx, imgData };
}

/**
 * 对数变换 - 增强暗部细节
 */
export function logarithmicTransform(imageData: ProcessImageData): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  // 找最大值用于归一化
  let maxVal = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (gray > maxVal) maxVal = gray;
  }
  
  const c = 255 / Math.log(1 + maxVal);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const newGray = c * Math.log(1 + gray);
    const val = Math.min(255, Math.max(0, Math.round(newGray)));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 反色变换
 */
export function inverseTransform(imageData: ProcessImageData): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 幂次变换（伽马变换）
 */
export function gammaTransform(
  imageData: ProcessImageData,
  params: GammaParams
): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  const gamma = params.gamma;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(data[i] / 255, gamma))));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(data[i + 1] / 255, gamma))));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(data[i + 2] / 255, gamma))));
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 直方图均衡化
 */
export function histogramEqualization(imageData: ProcessImageData): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  const totalPixels = data.length / 4;
  
  // 分别对RGB三个通道进行直方图均衡化
  for (let channel = 0; channel < 3; channel++) {
    const histogram = new Array(256).fill(0);
    const cdf = new Array(256).fill(0);
    
    // 计算直方图
    for (let i = channel; i < data.length; i += 4) {
      histogram[data[i]]++;
    }
    
    // 计算累积分布函数
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    // 找到最小非零CDF值
    let minCdf = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        minCdf = cdf[i];
        break;
      }
    }
    
    // 应用均衡化
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        lut[i] = Math.round(((cdf[i] - minCdf) / (totalPixels - minCdf)) * 255);
      } else {
        lut[i] = 0;
      }
    }
    
    // 应用查找表
    for (let i = channel; i < data.length; i += 4) {
      data[i] = lut[data[i]];
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 分段线性变换
 */
export function linearTransform(
  imageData: ProcessImageData,
  params: LinearTransformParams
): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  const { a, b, c, d } = params;
  
  // 构建查找表
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    if (i <= a) {
      lut[i] = (c / a) * i;
    } else if (i <= b) {
      lut[i] = c + ((d - c) / (b - a)) * (i - a);
    } else {
      lut[i] = d + ((255 - d) / (255 - b)) * (i - b);
    }
    lut[i] = Math.min(255, Math.max(0, Math.round(lut[i])));
  }
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 对比度拉伸
 */
export function contrastStretch(imageData: ProcessImageData): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  // 找到每个通道的最小和最大值
  const minVal = [255, 255, 255];
  const maxVal = [0, 0, 0];
  
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      if (data[i + c] < minVal[c]) minVal[c] = data[i + c];
      if (data[i + c] > maxVal[c]) maxVal[c] = data[i + c];
    }
  }
  
  // 拉伸
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      if (maxVal[c] > minVal[c]) {
        data[i + c] = Math.round(((data[i + c] - minVal[c]) / (maxVal[c] - minVal[c])) * 255);
      }
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 转灰度图
 */
export function toGrayscale(imageData: ProcessImageData): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 二值化
 */
export function binary(imageData: ProcessImageData, threshold: number = 128): ProcessImageData {
  const { canvas, ctx, imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = gray > threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 获取直方图数据
 */
export function getHistogram(imageData: ProcessImageData): { r: number[]; g: number[]; b: number[]; gray: number[] } {
  const { imgData } = createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
  const data = imgData.data;
  
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const gray = new Array(256).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
    const grayVal = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[grayVal]++;
  }
  
  return { r, g, b, gray };
}
