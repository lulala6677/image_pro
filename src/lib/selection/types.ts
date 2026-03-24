// 选区工具类型定义

// 选区工具类型
export type SelectionToolType = 'wand' | 'lasso' | 'none';

// 点
export interface Point {
  x: number;
  y: number;
}

// 选区数据
export interface SelectionData {
  // 选区蒙版 - 与图像尺寸相同的布尔数组
  mask: boolean[][];
  // 选区边界（用于优化渲染）
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // 选区工具类型
  toolType: SelectionToolType;
}

// 魔棒工具参数
export interface WandToolParams {
  // 颜色容差 (0-255)
  tolerance: number;
  // 是否连续
  contiguous: boolean;
  // 是否反选
  invert: boolean;
}

// 套索工具参数
export interface LassoToolParams {
  // 羽化半径
  feather: number;
  // 是否反选
  invert: boolean;
}

// 选区工具状态
export interface SelectionToolState {
  // 当前激活的工具
  activeTool: SelectionToolType;
  // 当前选区
  selection: SelectionData | null;
  // 魔棒参数
  wandParams: WandToolParams;
  // 套索参数
  lassoParams: LassoToolParams;
  // 套索绘制中的点
  lassoPoints: Point[];
  // 是否正在绘制
  isDrawing: boolean;
}
