// 颜色调整和分割处理函数

import type { ColorAdjustParams, HSIParams, ThresholdParams, RegionGrowParams, ProcessImageData, RGB, HSI } from './types';

/**
 * RGB转HSI
 */
function rgbToHsi(r: number, g: number, b: number): HSI {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const i = (r + g + b) / 3;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    s = 1 - min / i;
    const num = ((r - g) + (r - b)) / 2;
    const den = Math.sqrt((r - g) * (r - g) + (r - b) * (g - b));
    
    if (den !== 0) {
      let theta = Math.acos(num / den) * 180 / Math.PI;
      
      if (b <= g) {
        h = theta;
      } else {
        h = 360 - theta;
      }
    }
  }
  
  return { h, s: s * 100, i: i * 255 };
}

/**
 * HSI转RGB
 */
function hsiToRgb(h: number, s: number, i: number): RGB {
  h = h;
  s = s / 100;
  i = i / 255;
  
  let r = 0, g = 0, b = 0;
  
  if (h === 0) {
    r = g = b = i;
  } else if (h <= 120) {
    r = i * (1 + s * Math.cos(h * Math.PI / 180) / Math.cos((60 - h) * Math.PI / 180));
    b = i * (1 - s);
    g = 3 * i - r - b;
  } else if (h <= 240) {
    const hp = h - 120;
    g = i * (1 + s * Math.cos(hp * Math.PI / 180) / Math.cos((60 - hp) * Math.PI / 180));
    r = i * (1 - s);
    b = 3 * i - r - g;
  } else {
    const hp = h - 240;
    b = i * (1 + s * Math.cos(hp * Math.PI / 180) / Math.cos((60 - hp) * Math.PI / 180));
    g = i * (1 - s);
    r = 3 * i - g - b;
  }
  
  return {
    r: Math.min(255, Math.max(0, Math.round(r * 255))),
    g: Math.min(255, Math.max(0, Math.round(g * 255))),
    b: Math.min(255, Math.max(0, Math.round(b * 255)))
  };
}

/**
 * RGB转HSI图像
 */
export function rgbToHsiImage(
  imageData: ProcessImageData,
  params: HSIParams
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const hsi = rgbToHsi(data[i], data[i + 1], data[i + 2]);
    
    let val: number;
    switch (params.channel) {
      case 'h':
        val = Math.round(hsi.h / 360 * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        break;
      case 's':
        val = Math.round(hsi.s / 100 * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        break;
      case 'i':
        data[i] = Math.round(hsi.i);
        data[i + 1] = Math.round(hsi.i);
        data[i + 2] = Math.round(hsi.i);
        break;
      case 'all':
        data[i] = Math.round(hsi.h / 360 * 255);
        data[i + 1] = Math.round(hsi.s / 100 * 255);
        data[i + 2] = Math.round(hsi.i);
        break;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 颜色调整
 */
export function adjustColor(
  imageData: ProcessImageData,
  params: ColorAdjustParams
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  const brightness = params.brightness;
  const contrast = params.contrast;
  const saturation = params.saturation;
  const hueShift = params.hue;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // 转HSI
    const hsi = rgbToHsi(r, g, b);
    
    // 调整亮度
    let newI = hsi.i + brightness;
    
    // 调整对比度
    newI = ((newI - 128) * (contrast / 100 + 1)) + 128;
    
    // 调整饱和度
    let newS = hsi.s * (saturation / 100 + 1);
    
    // 调整色相
    let newH = (hsi.h + hueShift) % 360;
    if (newH < 0) newH += 360;
    
    // 转回RGB
    const rgb = hsiToRgb(newH, newS, newI);
    
    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 色相旋转
 */
export function hueRotate(
  imageData: ProcessImageData,
  angle: number
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const hsi = rgbToHsi(data[i], data[i + 1], data[i + 2]);
    let newH = (hsi.h + angle) % 360;
    if (newH < 0) newH += 360;
    
    const rgb = hsiToRgb(newH, hsi.s, hsi.i);
    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 全局阈值分割
 */
export function globalThreshold(
  imageData: ProcessImageData,
  threshold: number = 128
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
 * Otsu阈值分割
 */
export function otsuThreshold(imageData: ProcessImageData): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const totalPixels = data.length / 4;
  
  // 计算直方图
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }
  
  // 计算Otsu阈值
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    const wF = totalPixels - wB;
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  
  // 应用阈值
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
 * 自适应阈值分割
 */
export function adaptiveThreshold(
  imageData: ProcessImageData,
  blockSize: number = 11,
  c: number = 2
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;
  const half = Math.floor(blockSize / 2);
  
  // 先转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 计算局部均值
      let sum = 0;
      let count = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const px = Math.min(width - 1, Math.max(0, x + kx));
          sum += gray[py * width + px];
          count++;
        }
      }
      
      const localMean = sum / count;
      const pixel = gray[y * width + x];
      const val = pixel > localMean - c ? 255 : 0;
      
      const idx = (y * width + x) * 4;
      output[idx] = val;
      output[idx + 1] = val;
      output[idx + 2] = val;
      output[idx + 3] = 255;
    }
  }
  
  const outputData = new ImageData(output, width, height);
  ctx.putImageData(outputData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 区域生长分割
 */
export function regionGrowing(
  imageData: ProcessImageData,
  params: RegionGrowParams
): ProcessImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const img = new Image();
  img.src = imageData.dataUrl;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // 先转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const seedX = Math.min(width - 1, Math.max(0, params.seedX));
  const seedY = Math.min(height - 1, Math.max(0, params.seedY));
  const seedValue = gray[seedY * width + seedX];
  
  const visited = new Uint8Array(width * height);
  const output = new Uint8ClampedArray(data.length);
  
  // 初始化输出为黑色
  for (let i = 0; i < output.length; i++) {
    output[i] = i % 4 === 3 ? 255 : 0;
  }
  
  const queue: [number, number][] = [[seedX, seedY]];
  visited[seedY * width + seedX] = 1;
  
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const currentIdx = y * width + x;
    
    // 标记为白色
    const outIdx = currentIdx * 4;
    output[outIdx] = 255;
    output[outIdx + 1] = 255;
    output[outIdx + 2] = 255;
    
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          const diff = Math.abs(gray[nIdx] - seedValue);
          if (diff <= params.threshold) {
            visited[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  
  const outputData = new ImageData(output, width, height);
  ctx.putImageData(outputData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 统一阈值分割入口
 */
export function applyThreshold(
  imageData: ProcessImageData,
  params: ThresholdParams
): ProcessImageData {
  switch (params.method) {
    case 'global':
      return globalThreshold(imageData, params.threshold);
    case 'otsu':
      return otsuThreshold(imageData);
    case 'adaptive':
      return adaptiveThreshold(imageData, params.blockSize, params.c);
    default:
      return globalThreshold(imageData, params.threshold);
  }
}
