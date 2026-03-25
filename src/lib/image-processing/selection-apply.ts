// 选区应用工具 - 将处理结果与原图混合

import type { SelectionData } from '../selection/types';

/**
 * 将处理后的图像与原图按选区混合
 * @param originalData 原图像素数据
 * @param processedData 处理后的像素数据
 * @param selection 选区数据
 * @returns 混合后的像素数据
 */
export function applySelectionMask(
  originalData: ImageData,
  processedData: ImageData,
  selection: SelectionData | null
): ImageData {
  // 如果没有选区，直接返回处理后的图像
  if (!selection || !selection.mask || selection.bounds.width === 0) {
    console.log('无选区，返回处理后图像');
    return processedData;
  }
  
  const { width, height } = originalData;
  const result = new ImageData(width, height);
  const { mask } = selection;
  
  // 检查 mask 尺寸是否匹配
  if (mask.length !== height || (mask[0] && mask[0].length !== width)) {
    console.warn('选区 mask 尺寸不匹配:', { 
      maskHeight: mask.length, 
      maskWidth: mask[0]?.length,
      imageHeight: height,
      imageWidth: width
    });
    return processedData;
  }
  
  // 统计选区内像素数量
  let selectedCount = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isSelected = mask[y] && mask[y][x];
      
      if (isSelected) {
        selectedCount++;
        // 选区内使用处理后的像素
        result.data[idx] = processedData.data[idx];
        result.data[idx + 1] = processedData.data[idx + 1];
        result.data[idx + 2] = processedData.data[idx + 2];
        result.data[idx + 3] = processedData.data[idx + 3];
      } else {
        // 选区外使用原图像素
        result.data[idx] = originalData.data[idx];
        result.data[idx + 1] = originalData.data[idx + 1];
        result.data[idx + 2] = originalData.data[idx + 2];
        result.data[idx + 3] = originalData.data[idx + 3];
      }
    }
  }
  
  console.log('选区应用完成:', { selectedCount, totalPixels: width * height });
  
  return result;
}

/**
 * 使用选区处理图像的高阶函数
 * @param processFn 原始处理函数
 * @param imageData 输入图像数据
 * @param selection 选区
 * @returns 处理后的 data URL
 */
export async function processWithSelection(
  processFn: (ctx: CanvasRenderingContext2D, imageData: ImageData) => ImageData,
  dataUrl: string,
  width: number,
  height: number,
  selection: SelectionData | null
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // 获取原始像素数据
      ctx.drawImage(img, 0, 0);
      const originalData = ctx.getImageData(0, 0, width, height);
      
      // 处理图像
      const processedData = processFn(ctx, new ImageData(new Uint8ClampedArray(originalData.data), width, height));
      
      // 应用选区
      const resultData = applySelectionMask(originalData, processedData, selection);
      
      // 输出结果
      ctx.putImageData(resultData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.src = dataUrl;
  });
}

/**
 * 创建一个支持选区的处理函数包装器
 */
export function createSelectionAwareProcessor<TParams extends object>(
  processor: (imageData: ImageData, params: TParams) => ImageData
): (dataUrl: string, width: number, height: number, params: TParams, selection: SelectionData | null) => Promise<string> {
  return async (dataUrl, width, height, params, selection) => {
    return processWithSelection(
      (ctx, imageData) => processor(imageData, params),
      dataUrl,
      width,
      height,
      selection
    );
  };
}
