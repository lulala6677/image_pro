// 选区处理工具函数

import type { Point, SelectionData, WandToolParams, LassoToolParams } from './types';

/**
 * 从 canvas 获取像素数据
 */
export function getPixelData(imageData: string, width: number, height: number): Promise<ImageData> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.src = imageData;
  });
}

/**
 * 魔棒工具 - 基于颜色相似度选择区域
 */
export function magicWandSelect(
  pixelData: ImageData,
  startX: number,
  startY: number,
  params: WandToolParams
): SelectionData {
  const { width, height, data } = pixelData;
  const { tolerance, contiguous, invert } = params;
  
  console.log('魔棒选择:', { width, height, startX, startY, tolerance, contiguous });
  
  // 创建选区蒙版 - 确保每行是独立数组
  const mask: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    mask[y] = new Array(width).fill(false);
  }
  
  // 获取起始点颜色
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  
  // 计算颜色距离
  const colorDistance = (idx: number): number => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return Math.sqrt(
      (r - startR) ** 2 +
      (g - startG) ** 2 +
      (b - startB) ** 2
    );
  };
  
  if (contiguous) {
    // 连续选择 - 使用洪水填充算法
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    const queue: Point[] = [{ x: startX, y: startY }];
    visited[startY][startX] = true;
    
    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];
    
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const idx = (y * width + x) * 4;
      
      if (colorDistance(idx) <= tolerance) {
        mask[y][x] = true;
        
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  } else {
    // 非连续选择 - 全图颜色匹配
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (colorDistance(idx) <= tolerance) {
          mask[y][x] = true;
        }
      }
    }
  }
  
  // 反选
  if (invert) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        mask[y][x] = !mask[y][x];
      }
    }
  }
  
  // 计算边界
  const bounds = calculateBounds(mask, width, height);
  
  return { mask, bounds, toolType: 'wand' };
}

/**
 * 套索工具 - 基于绘制的多边形选择区域
 */
export function lassoSelect(
  width: number,
  height: number,
  points: Point[],
  params: LassoToolParams
): SelectionData {
  const { feather, invert } = params;
  
  // 创建选区蒙版 - 确保每行是独立数组
  const mask: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    mask[y] = new Array(width).fill(false);
  }
  
  if (points.length < 3) {
    return { mask, bounds: { x: 0, y: 0, width: 0, height: 0 }, toolType: 'lasso' };
  }
  
  console.log('套索选择:', { width, height, pointsCount: points.length });
  
  // 使用射线法判断点是否在多边形内
  const pointInPolygon = (px: number, py: number): boolean => {
    let inside = false;
    const n = points.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;
      
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };
  
  // 填充多边形内部
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y][x] = pointInPolygon(x, y);
    }
  }
  
  // 应用羽化
  if (feather > 0) {
    applyFeather(mask, width, height, feather);
  }
  
  // 反选
  if (invert) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        mask[y][x] = !mask[y][x];
      }
    }
  }
  
  // 计算边界
  const bounds = calculateBounds(mask, width, height);
  
  return { mask, bounds, toolType: 'lasso' };
}

/**
 * 应用羽化效果
 */
function applyFeather(mask: boolean[][], width: number, height: number, radius: number): void {
  // 创建临时缓冲区存储羽化值
  const buffer: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  
  // 水平方向模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          sum += mask[y][nx] ? 1 : 0;
          count++;
        }
      }
      buffer[y][x] = sum / count;
    }
  }
  
  // 垂直方向模糊
  const tempMask = mask.map(row => [...row]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height) {
          sum += buffer[ny][x];
          count++;
        }
      }
      tempMask[y][x] = (sum / count) > 0.5;
    }
  }
  
  // 复制结果
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y][x] = tempMask[y][x];
    }
  }
}

/**
 * 计算选区边界
 */
function calculateBounds(mask: boolean[][], width: number, height: number): { x: number; y: number; width: number; height: number } {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * 创建选区蒙版的可视化图像
 */
export function createSelectionOverlay(
  selection: SelectionData,
  width: number,
  height: number,
  color: string = 'rgba(0, 120, 255, 0.3)'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 绘制选区外部的半透明遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  // 在选区内部清除遮罩
  ctx.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (selection.mask[y] && selection.mask[y][x]) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  
  // 绘制选区边界线
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  
  // 查找边界像素并绘制
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (selection.mask[y] && selection.mask[y][x]) {
        // 检查是否是边界像素
        const isEdge = 
          x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
          !selection.mask[y - 1]?.[x] ||
          !selection.mask[y + 1]?.[x] ||
          !selection.mask[y]?.[x - 1] ||
          !selection.mask[y]?.[x + 1];
        
        if (isEdge) {
          ctx.strokeRect(x - 0.5, y - 0.5, 1, 1);
        }
      }
    }
  }
  
  return canvas.toDataURL();
}

/**
 * 清空选区
 */
export function clearSelection(width: number, height: number): SelectionData {
  return {
    mask: Array(height).fill(null).map(() => Array(width).fill(false)),
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    toolType: 'none',
  };
}

/**
 * 全选
 */
export function selectAll(width: number, height: number): SelectionData {
  return {
    mask: Array(height).fill(null).map(() => Array(width).fill(true)),
    bounds: { x: 0, y: 0, width, height },
    toolType: 'none',
  };
}

/**
 * 矩形选区
 */
export function rectangleSelect(
  width: number,
  height: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SelectionData {
  // 创建选区蒙版 - 确保每行是独立数组
  const mask: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    mask[y] = new Array(width).fill(false);
  }
  
  // 计算矩形边界
  const minX = Math.max(0, Math.min(startX, endX));
  const maxX = Math.min(width - 1, Math.max(startX, endX));
  const minY = Math.max(0, Math.min(startY, endY));
  const maxY = Math.min(height - 1, Math.max(startY, endY));
  
  console.log('矩形选择:', { width, height, startX, startY, endX, endY, minX, maxX, minY, maxY });
  
  // 填充矩形区域
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      mask[y][x] = true;
    }
  }
  
  // 计算边界
  const bounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
  
  return { mask, bounds, toolType: 'rectangle' };
}

/**
 * 椭圆选区
 */
export function ellipseSelect(
  width: number,
  height: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SelectionData {
  // 创建选区蒙版 - 确保每行是独立数组
  const mask: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    mask[y] = new Array(width).fill(false);
  }
  
  // 计算椭圆边界框
  const minX = Math.max(0, Math.min(startX, endX));
  const maxX = Math.min(width - 1, Math.max(startX, endX));
  const minY = Math.max(0, Math.min(startY, endY));
  const maxY = Math.min(height - 1, Math.max(startY, endY));
  
  // 椭圆中心和半径
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radiusX = (maxX - minX) / 2;
  const radiusY = (maxY - minY) / 2;
  
  console.log('椭圆选择:', { width, height, startX, startY, endX, endY, centerX, centerY, radiusX, radiusY });
  
  // 填充椭圆区域
  if (radiusX > 0 && radiusY > 0) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // 椭圆方程: (x-cx)²/rx² + (y-cy)²/ry² <= 1
        const dx = x - centerX;
        const dy = y - centerY;
        if ((dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1) {
          mask[y][x] = true;
        }
      }
    }
  }
  
  // 计算边界
  const bounds = calculateBounds(mask, width, height);
  
  return { mask, bounds, toolType: 'ellipse' };
}

/**
 * 反选选区
 */
export function invertSelection(selection: SelectionData): SelectionData {
  const { mask, bounds } = selection;
  const height = mask.length;
  const width = mask[0]?.length || 0;
  
  const newMask = mask.map(row => row.map(cell => !cell));
  
  return {
    mask: newMask,
    bounds: calculateBounds(newMask, width, height),
    toolType: selection.toolType,
  };
}
