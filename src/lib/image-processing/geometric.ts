// 几何变换处理函数

import type { ResizeParams, RotateParams, FlipParams, TranslateParams, CropParams, ProcessImageData } from './types';
import { createImageFromDataUrl, canvasToProcessImageData } from './utils';

/**
 * 缩放图像
 */
export function resize(
  imageData: ProcessImageData,
  params: ResizeParams
): ProcessImageData {
  const img = createImageFromDataUrl(imageData.dataUrl);
  
  let newWidth: number, newHeight: number;
  
  if (params.maintainAspect) {
    const ratio = imageData.width / imageData.height;
    newWidth = imageData.width * params.scaleX;
    newHeight = newWidth / ratio;
  } else {
    newWidth = imageData.width * params.scaleX;
    newHeight = imageData.height * params.scaleY;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = Math.max(1, Math.round(newWidth));
  canvas.height = Math.max(1, Math.round(newHeight));
  
  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvasToProcessImageData(canvas, imageData);
}

/**
 * 旋转图像
 */
export function rotate(
  imageData: ProcessImageData,
  params: RotateParams
): ProcessImageData {
  const img = createImageFromDataUrl(imageData.dataUrl);
  
  const radians = (params.angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  
  // 计算旋转后的画布大小
  const newWidth = imageData.width * cos + imageData.height * sin;
  const newHeight = imageData.width * sin + imageData.height * cos;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = Math.max(1, Math.round(newWidth));
  canvas.height = Math.max(1, Math.round(newHeight));
  
  // 填充背景色
  ctx.fillStyle = params.fillColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -imageData.width / 2, -imageData.height / 2);
  
  return canvasToProcessImageData(canvas, imageData);
}

/**
 * 翻转图像
 */
export function flip(
  imageData: ProcessImageData,
  params: FlipParams
): ProcessImageData {
  const img = createImageFromDataUrl(imageData.dataUrl);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  
  if (params.direction === 'horizontal') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }
  
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  
  return canvasToProcessImageData(canvas, imageData);
}

/**
 * 平移图像
 */
export function translate(
  imageData: ProcessImageData,
  params: TranslateParams
): ProcessImageData {
  const img = createImageFromDataUrl(imageData.dataUrl);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  const offsetX = (params.offsetX / 100) * imageData.width;
  const offsetY = (params.offsetY / 100) * imageData.height;
  
  ctx.fillStyle = params.fillColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, offsetX, offsetY);
  
  return canvasToProcessImageData(canvas, imageData);
}

/**
 * 裁剪图像
 */
export function crop(
  imageData: ProcessImageData,
  params: CropParams
): ProcessImageData {
  const img = createImageFromDataUrl(imageData.dataUrl);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = Math.max(1, params.width);
  canvas.height = Math.max(1, params.height);
  
  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.drawImage(
    img,
    params.x, params.y, params.width, params.height,
    0, 0, params.width, params.height
  );
  
  return canvasToProcessImageData(canvas, imageData);
}
