// 边缘检测和频域处理函数

import type { EdgeParams, ProcessImageData } from './types';

/**
 * Sobel边缘检测
 */
export function sobelEdgeDetection(
  imageData: ProcessImageData,
  params?: { threshold?: number }
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
  const threshold = params?.threshold || 0;
  
  // 先转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // Sobel核
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * width + x) * 4;
      const val = threshold > 0 ? (magnitude > threshold ? 255 : 0) : Math.min(255, magnitude);
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
 * Laplacian边缘检测
 */
export function laplacianEdgeDetection(
  imageData: ProcessImageData,
  params?: { threshold?: number }
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
  const threshold = params?.threshold || 0;
  
  // 先转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // Laplacian核
  const laplacian = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          sum += pixel * laplacian[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.abs(sum);
      const idx = (y * width + x) * 4;
      const val = threshold > 0 ? (magnitude > threshold ? 255 : 0) : Math.min(255, magnitude);
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
 * Prewitt边缘检测
 */
export function prewittEdgeDetection(
  imageData: ProcessImageData,
  params?: { threshold?: number }
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
  const threshold = params?.threshold || 0;
  
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const prewittX = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
  const prewittY = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          gx += pixel * prewittX[ky + 1][kx + 1];
          gy += pixel * prewittY[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * width + x) * 4;
      const val = threshold > 0 ? (magnitude > threshold ? 255 : 0) : Math.min(255, magnitude);
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
 * Roberts边缘检测
 */
export function robertsEdgeDetection(
  imageData: ProcessImageData,
  params?: { threshold?: number }
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
  const threshold = params?.threshold || 0;
  
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const gx = gray[y * width + x] - gray[(y + 1) * width + (x + 1)];
      const gy = gray[y * width + (x + 1)] - gray[(y + 1) * width + x];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * width + x) * 4;
      const val = threshold > 0 ? (magnitude > threshold ? 255 : 0) : Math.min(255, magnitude);
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
 * LoG (Laplacian of Gaussian) 边缘检测
 */
export function logEdgeDetection(
  imageData: ProcessImageData,
  params?: { sigma?: number; threshold?: number }
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
  const sigma = params?.sigma || 1.4;
  const threshold = params?.threshold || 0;
  
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // 生成LoG核
  const radius = Math.ceil(sigma * 3);
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  
  for (let y = -radius; y <= radius; y++) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x++) {
      const r2 = x * x + y * y;
      const s2 = sigma * sigma;
      const val = -1 / (Math.PI * s2 * s2) * (1 - r2 / (2 * s2)) * Math.exp(-r2 / (2 * s2));
      row.push(val);
    }
    kernel.push(row);
  }
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let sum = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[ky + radius][kx + radius];
        }
      }
      
      const magnitude = Math.abs(sum);
      const idx = (y * width + x) * 4;
      const val = threshold > 0 ? (magnitude > threshold ? 255 : 0) : Math.min(255, magnitude * 1000);
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
 * Canny边缘检测（简化版）
 */
export function cannyEdgeDetection(
  imageData: ProcessImageData,
  params?: { lowThreshold?: number; highThreshold?: number }
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
  const lowThreshold = params?.lowThreshold || 30;
  const highThreshold = params?.highThreshold || 80;
  
  // 1. 转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // 2. 高斯平滑
  const sigma = 1.4;
  const kernelSize = 5;
  const half = Math.floor(kernelSize / 2);
  const gaussianKernel: number[] = [];
  let gaussianSum = 0;
  
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      gaussianKernel.push(val);
      gaussianSum += val;
    }
  }
  
  const blurred = new Float32Array(width * height);
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * gaussianKernel[k++];
        }
      }
      blurred[y * width + x] = sum / gaussianSum;
    }
  }
  
  // 3. 计算梯度
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  const gradient = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = blurred[(y + ky) * width + (x + kx)];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }
      
      gradient[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      direction[y * width + x] = Math.atan2(gy, gx);
    }
  }
  
  // 4. 非极大值抑制
  const nms = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const angle = direction[y * width + x] * 180 / Math.PI;
      const mag = gradient[y * width + x];
      
      let neighbor1 = 0, neighbor2 = 0;
      
      if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5 || angle < -157.5)) {
        neighbor1 = gradient[y * width + (x + 1)];
        neighbor2 = gradient[y * width + (x - 1)];
      } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
        neighbor1 = gradient[(y - 1) * width + (x + 1)];
        neighbor2 = gradient[(y + 1) * width + (x - 1)];
      } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
        neighbor1 = gradient[(y - 1) * width + x];
        neighbor2 = gradient[(y + 1) * width + x];
      } else {
        neighbor1 = gradient[(y - 1) * width + (x - 1)];
        neighbor2 = gradient[(y + 1) * width + (x + 1)];
      }
      
      if (mag >= neighbor1 && mag >= neighbor2) {
        nms[y * width + x] = mag;
      }
    }
  }
  
  // 5. 双阈值检测
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const mag = nms[y * width + x];
      
      if (mag >= highThreshold) {
        output[idx] = 255;
        output[idx + 1] = 255;
        output[idx + 2] = 255;
      } else if (mag >= lowThreshold) {
        // 检查是否有强边缘邻居
        let hasStrong = false;
        for (let ky = -1; ky <= 1 && !hasStrong; ky++) {
          for (let kx = -1; kx <= 1 && !hasStrong; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              if (nms[ny * width + nx] >= highThreshold) {
                hasStrong = true;
              }
            }
          }
        }
        const val = hasStrong ? 255 : 0;
        output[idx] = val;
        output[idx + 1] = val;
        output[idx + 2] = val;
      }
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
 * 统一边缘检测入口
 */
export function detectEdge(
  imageData: ProcessImageData,
  params: EdgeParams
): ProcessImageData {
  switch (params.type) {
    case 'sobel':
      return sobelEdgeDetection(imageData, { threshold: params.threshold });
    case 'laplacian':
      return laplacianEdgeDetection(imageData, { threshold: params.threshold });
    case 'prewitt':
      return prewittEdgeDetection(imageData, { threshold: params.threshold });
    case 'roberts':
      return robertsEdgeDetection(imageData, { threshold: params.threshold });
    case 'log':
      return logEdgeDetection(imageData, { threshold: params.threshold, sigma: params.kernelSize });
    case 'canny':
      return cannyEdgeDetection(imageData, { 
        lowThreshold: params.threshold ? params.threshold * 0.4 : 30,
        highThreshold: params.threshold || 80
      });
    default:
      return sobelEdgeDetection(imageData);
  }
}
