// 图像处理辅助函数

import type { ProcessImageData } from './types';

/**
 * 辅助函数：创建带图片的 canvas
 * 确保 data URL 图片正确加载后再进行像素操作
 */
export function createCanvasWithImage(
  dataUrl: string, 
  width: number, 
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imgData: ImageData } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  // 填充白色背景，防止透明区域显示异常
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  const img = new Image();
  img.src = dataUrl;
  
  // 对于 data URL，图片应该立即可用
  // 但我们需要确保图片已经解码
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    // 如果图片还未加载完成，同步等待
    // 注意：这仅在特定情况下有效
    try {
      ctx.drawImage(img, 0, 0, width, height);
    } catch (e) {
      console.error('Failed to draw image:', e);
    }
  }
  
  const imgData = ctx.getImageData(0, 0, width, height);
  
  return { canvas, ctx, imgData };
}

/**
 * 辅助函数：从 data URL 创建 Image 对象
 * 用于几何变换等需要重新绘制图像的操作
 */
export function createImageFromDataUrl(dataUrl: string): HTMLImageElement {
  const img = new Image();
  img.src = dataUrl;
  return img;
}

/**
 * 辅助函数：从 ProcessImageData 创建 canvas
 */
export function processImageDataToCanvas(
  imageData: ProcessImageData
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imgData: ImageData } {
  return createCanvasWithImage(imageData.dataUrl, imageData.width, imageData.height);
}

/**
 * 辅助函数：输出处理结果
 */
export function canvasToProcessImageData(
  canvas: HTMLCanvasElement,
  originalData: ProcessImageData
): ProcessImageData {
  return {
    ...originalData,
    dataUrl: canvas.toDataURL('image/png')
  };
}
