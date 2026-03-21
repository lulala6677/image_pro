// 滤波处理函数

import type { 
  SaltPepperParams, 
  GaussianNoiseParams,
  ProcessImageData 
} from './types';

/**
 * 添加椒盐噪声
 */
export function addSaltPepperNoise(
  imageData: ProcessImageData,
  params: SaltPepperParams
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
  const totalPixels = data.length / 4;
  
  const saltCount = Math.floor(totalPixels * params.saltProb);
  const pepperCount = Math.floor(totalPixels * params.pepperProb);
  
  // 添加盐噪声（白点）
  for (let i = 0; i < saltCount; i++) {
    const idx = Math.floor(Math.random() * totalPixels) * 4;
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
  }
  
  // 添加椒噪声（黑点）
  for (let i = 0; i < pepperCount; i++) {
    const idx = Math.floor(Math.random() * totalPixels) * 4;
    data[idx] = 0;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 添加高斯噪声
 */
export function addGaussianNoise(
  imageData: ProcessImageData,
  params: GaussianNoiseParams
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
  
  // Box-Muller变换生成高斯随机数
  const generateGaussian = (mean: number, variance: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * Math.sqrt(variance);
  };
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = generateGaussian(params.mean, params.variance);
    data[i] = Math.min(255, Math.max(0, Math.round(data[i] + noise)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] + noise)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] + noise)));
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 高斯模糊
 */
export function gaussianBlur(
  imageData: ProcessImageData,
  params: { radius: number; sigma?: number }
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
  
  const radius = Math.max(1, params.radius);
  const sigma = params.sigma || radius / 2;
  const size = radius * 2 + 1;
  
  // 生成高斯核
  const kernel: number[][] = [];
  let sum = 0;
  
  for (let y = -radius; y <= radius; y++) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(val);
      sum += val;
    }
    kernel.push(row);
  }
  
  // 归一化
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          const weight = kernel[ky + radius][kx + radius];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.round(r);
      output[idx + 1] = Math.round(g);
      output[idx + 2] = Math.round(b);
      output[idx + 3] = data[idx + 3];
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
 * 中值滤波
 */
export function medianFilter(
  imageData: ProcessImageData,
  params: { kernelSize: number }
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
  const size = Math.max(1, params.kernelSize);
  const half = Math.floor(size / 2);
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          
          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }
      
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);
      
      const mid = Math.floor(rValues.length / 2);
      const idx = (y * width + x) * 4;
      output[idx] = rValues[mid];
      output[idx + 1] = gValues[mid];
      output[idx + 2] = bValues[mid];
      output[idx + 3] = data[idx + 3];
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
 * 均值滤波
 */
export function meanFilter(
  imageData: ProcessImageData,
  params: { kernelSize: number }
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
  const size = Math.max(1, params.kernelSize);
  const half = Math.floor(size / 2);
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.round(r / count);
      output[idx + 1] = Math.round(g / count);
      output[idx + 2] = Math.round(b / count);
      output[idx + 3] = data[idx + 3];
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
 * 运动模糊
 */
export function motionBlur(
  imageData: ProcessImageData,
  params: { distance: number; angle: number }
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
  const distance = Math.max(1, params.distance);
  const radians = (params.angle * Math.PI) / 180;
  
  const output = new Uint8ClampedArray(data.length);
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let i = -distance; i <= distance; i++) {
        const px = Math.round(x + i * dx);
        const py = Math.round(y + i * dy);
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.round(r / count);
      output[idx + 1] = Math.round(g / count);
      output[idx + 2] = Math.round(b / count);
      output[idx + 3] = data[idx + 3];
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
 * 锐化滤波
 */
export function sharpenFilter(
  imageData: ProcessImageData,
  params: { type: string; strength: number }
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
  const strength = params.strength;
  
  // 锐化核（拉普拉斯）
  const kernel = [
    [0, -1, 0],
    [-1, 4 + strength, -1],
    [0, -1, 0]
  ];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[ky + 1][kx + 1];
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = Math.min(255, Math.max(0, Math.round(r)));
      output[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      output[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      output[idx + 3] = data[idx + 3];
    }
  }
  
  // 复制边界
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const bottomIdx = ((height - 1) * width + x) * 4;
    output[topIdx] = data[topIdx];
    output[topIdx + 1] = data[topIdx + 1];
    output[topIdx + 2] = data[topIdx + 2];
    output[topIdx + 3] = data[topIdx + 3];
    output[bottomIdx] = data[bottomIdx];
    output[bottomIdx + 1] = data[bottomIdx + 1];
    output[bottomIdx + 2] = data[bottomIdx + 2];
    output[bottomIdx + 3] = data[bottomIdx + 3];
  }
  
  for (let y = 0; y < height; y++) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + width - 1) * 4;
    output[leftIdx] = data[leftIdx];
    output[leftIdx + 1] = data[leftIdx + 1];
    output[leftIdx + 2] = data[leftIdx + 2];
    output[leftIdx + 3] = data[leftIdx + 3];
    output[rightIdx] = data[rightIdx];
    output[rightIdx + 1] = data[rightIdx + 1];
    output[rightIdx + 2] = data[rightIdx + 2];
    output[rightIdx + 3] = data[rightIdx + 3];
  }
  
  const outputData = new ImageData(output, width, height);
  ctx.putImageData(outputData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}

/**
 * 双边滤波（简化版）
 */
export function bilateralFilter(
  imageData: ProcessImageData,
  params: { kernelSize: number; sigmaSpace: number; sigmaColor: number }
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
  const size = Math.max(1, params.kernelSize);
  const half = Math.floor(size / 2);
  const { sigmaSpace, sigmaColor } = params;
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 4;
      const centerR = data[centerIdx];
      const centerG = data[centerIdx + 1];
      const centerB = data[centerIdx + 2];
      
      let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // 空间权重
          const spatialDist = Math.sqrt(kx * kx + ky * ky);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));
          
          // 颜色权重
          const colorDist = Math.sqrt(
            (r - centerR) ** 2 + (g - centerG) ** 2 + (b - centerB) ** 2
          );
          const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));
          
          const weight = spatialWeight * colorWeight;
          
          sumR += r * weight;
          sumG += g * weight;
          sumB += b * weight;
          sumWeight += weight;
        }
      }
      
      output[centerIdx] = Math.round(sumR / sumWeight);
      output[centerIdx + 1] = Math.round(sumG / sumWeight);
      output[centerIdx + 2] = Math.round(sumB / sumWeight);
      output[centerIdx + 3] = data[centerIdx + 3];
    }
  }
  
  const outputData = new ImageData(output, width, height);
  ctx.putImageData(outputData, 0, 0);
  
  return {
    ...imageData,
    dataUrl: canvas.toDataURL()
  };
}
