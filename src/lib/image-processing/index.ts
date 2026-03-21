// 图像处理主模块 - 导出所有处理函数

export * from './types';
export * from './geometric';
export * from './grayscale';
export * from './filters';
export * from './edge';
export * from './color';

// 操作配置
import { OperationConfig } from './types';

export const OPERATION_CONFIGS: Record<string, OperationConfig[]> = {
  geometric: [
    {
      category: 'geometric',
      name: 'resize',
      icon: 'Maximize2',
      description: '缩放图像大小',
      params: [
        { name: 'scaleX', label: 'X轴缩放', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
        { name: 'scaleY', label: 'Y轴缩放', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
        { name: 'maintainAspect', label: '保持比例', type: 'boolean', default: true }
      ]
    },
    {
      category: 'geometric',
      name: 'rotate',
      icon: 'RotateCw',
      description: '旋转图像',
      params: [
        { name: 'angle', label: '角度', type: 'range', min: -180, max: 180, step: 1, default: 0 },
        { name: 'fillColor', label: '填充颜色', type: 'color', default: '#ffffff' }
      ]
    },
    {
      category: 'geometric',
      name: 'flip',
      icon: 'FlipHorizontal',
      description: '翻转图像',
      params: [
        { name: 'direction', label: '翻转方向', type: 'select', default: 'horizontal', options: [
          { label: '水平翻转', value: 'horizontal' },
          { label: '垂直翻转', value: 'vertical' }
        ]}
      ]
    },
    {
      category: 'geometric',
      name: 'translate',
      icon: 'Move',
      description: '平移图像',
      params: [
        { name: 'offsetX', label: 'X轴偏移(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
        { name: 'offsetY', label: 'Y轴偏移(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
        { name: 'fillColor', label: '填充颜色', type: 'color', default: '#ffffff' }
      ]
    }
  ],
  grayscale: [
    {
      category: 'grayscale',
      name: 'toGrayscale',
      icon: 'Circle',
      description: '转换为灰度图',
      params: []
    },
    {
      category: 'grayscale',
      name: 'binary',
      icon: 'CircleDot',
      description: '二值化',
      params: [
        { name: 'threshold', label: '阈值', type: 'range', min: 0, max: 255, step: 1, default: 128 }
      ]
    },
    {
      category: 'grayscale',
      name: 'logarithmicTransform',
      icon: 'TrendingUp',
      description: '对数变换 - 增强暗部细节',
      params: []
    },
    {
      category: 'grayscale',
      name: 'inverseTransform',
      icon: 'SwitchCamera',
      description: '反色变换',
      params: []
    },
    {
      category: 'grayscale',
      name: 'gammaTransform',
      icon: 'Zap',
      description: '幂次变换（伽马变换）',
      params: [
        { name: 'gamma', label: '伽马值', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1 }
      ]
    },
    {
      category: 'grayscale',
      name: 'histogramEqualization',
      icon: 'BarChart3',
      description: '直方图均衡化',
      params: []
    },
    {
      category: 'grayscale',
      name: 'linearTransform',
      icon: 'Sliders',
      description: '分段线性变换',
      params: [
        { name: 'a', label: 'A点', type: 'range', min: 0, max: 255, step: 1, default: 50 },
        { name: 'b', label: 'B点', type: 'range', min: 0, max: 255, step: 1, default: 200 },
        { name: 'c', label: 'C点', type: 'range', min: 0, max: 255, step: 1, default: 0 },
        { name: 'd', label: 'D点', type: 'range', min: 0, max: 255, step: 1, default: 255 }
      ]
    },
    {
      category: 'grayscale',
      name: 'contrastStretch',
      icon: 'Expand',
      description: '对比度拉伸',
      params: []
    }
  ],
  noise: [
    {
      category: 'noise',
      name: 'addSaltPepperNoise',
      icon: 'Sparkles',
      description: '添加椒盐噪声',
      params: [
        { name: 'saltProb', label: '盐噪声比例', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.05 },
        { name: 'pepperProb', label: '椒噪声比例', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.05 }
      ]
    },
    {
      category: 'noise',
      name: 'addGaussianNoise',
      icon: 'Activity',
      description: '添加高斯噪声',
      params: [
        { name: 'mean', label: '均值', type: 'range', min: 0, max: 1, step: 0.1, default: 0 },
        { name: 'variance', label: '方差', type: 'range', min: 0, max: 1, step: 0.01, default: 0.1 }
      ]
    }
  ],
  filter: [
    {
      category: 'filter',
      name: 'gaussianBlur',
      icon: 'Cloud',
      description: '高斯模糊',
      params: [
        { name: 'radius', label: '半径', type: 'range', min: 1, max: 20, step: 1, default: 3 },
        { name: 'sigma', label: '标准差', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1.5 }
      ]
    },
    {
      category: 'filter',
      name: 'medianFilter',
      icon: 'Layers',
      description: '中值滤波 - 去除椒盐噪声',
      params: [
        { name: 'kernelSize', label: '核大小', type: 'range', min: 3, max: 15, step: 2, default: 3 }
      ]
    },
    {
      category: 'filter',
      name: 'meanFilter',
      icon: 'Grid3x3',
      description: '均值滤波',
      params: [
        { name: 'kernelSize', label: '核大小', type: 'range', min: 3, max: 15, step: 2, default: 3 }
      ]
    },
    {
      category: 'filter',
      name: 'motionBlur',
      icon: 'Wind',
      description: '运动模糊',
      params: [
        { name: 'distance', label: '距离', type: 'range', min: 1, max: 50, step: 1, default: 10 },
        { name: 'angle', label: '角度', type: 'range', min: 0, max: 360, step: 1, default: 0 }
      ]
    },
    {
      category: 'filter',
      name: 'sharpenFilter',
      icon: 'Focus',
      description: '锐化滤波',
      params: [
        { name: 'strength', label: '强度', type: 'range', min: 1, max: 10, step: 0.5, default: 2 }
      ]
    },
    {
      category: 'filter',
      name: 'bilateralFilter',
      icon: 'CircleDot',
      description: '双边滤波 - 保边去噪',
      params: [
        { name: 'kernelSize', label: '核大小', type: 'range', min: 3, max: 15, step: 2, default: 5 },
        { name: 'sigmaSpace', label: '空间标准差', type: 'range', min: 1, max: 20, step: 1, default: 5 },
        { name: 'sigmaColor', label: '颜色标准差', type: 'range', min: 1, max: 100, step: 5, default: 30 }
      ]
    }
  ],
  edge: [
    {
      category: 'edge',
      name: 'detectEdge',
      icon: 'Scan',
      description: '边缘检测',
      params: [
        { name: 'type', label: '检测方法', type: 'select', default: 'sobel', options: [
          { label: 'Sobel', value: 'sobel' },
          { label: 'Laplacian', value: 'laplacian' },
          { label: 'Prewitt', value: 'prewitt' },
          { label: 'Roberts', value: 'roberts' },
          { label: 'LoG', value: 'log' },
          { label: 'Canny', value: 'canny' }
        ]},
        { name: 'threshold', label: '阈值', type: 'range', min: 0, max: 255, step: 1, default: 50 }
      ]
    }
  ],
  color: [
    {
      category: 'color',
      name: 'adjustColor',
      icon: 'Palette',
      description: '颜色调整',
      params: [
        { name: 'brightness', label: '亮度', type: 'range', min: -100, max: 100, step: 1, default: 0 },
        { name: 'contrast', label: '对比度', type: 'range', min: -100, max: 100, step: 1, default: 0 },
        { name: 'saturation', label: '饱和度', type: 'range', min: -100, max: 100, step: 1, default: 0 },
        { name: 'hue', label: '色相', type: 'range', min: -180, max: 180, step: 1, default: 0 }
      ]
    },
    {
      category: 'color',
      name: 'hueRotate',
      icon: 'RefreshCw',
      description: '色相旋转',
      params: [
        { name: 'angle', label: '角度', type: 'range', min: -180, max: 180, step: 1, default: 0 }
      ]
    },
    {
      category: 'color',
      name: 'rgbToHsiImage',
      icon: 'Split',
      description: 'RGB转HSI',
      params: [
        { name: 'channel', label: '通道', type: 'select', default: 'all', options: [
          { label: 'H通道', value: 'h' },
          { label: 'S通道', value: 's' },
          { label: 'I通道', value: 'i' },
          { label: '全部', value: 'all' }
        ]}
      ]
    }
  ],
  segmentation: [
    {
      category: 'segmentation',
      name: 'applyThreshold',
      icon: 'Split',
      description: '阈值分割',
      params: [
        { name: 'method', label: '分割方法', type: 'select', default: 'otsu', options: [
          { label: '全局阈值', value: 'global' },
          { label: 'Otsu自动阈值', value: 'otsu' },
          { label: '自适应阈值', value: 'adaptive' }
        ]},
        { name: 'threshold', label: '阈值', type: 'range', min: 0, max: 255, step: 1, default: 128 },
        { name: 'blockSize', label: '块大小', type: 'range', min: 3, max: 31, step: 2, default: 11 },
        { name: 'c', label: '常数C', type: 'range', min: 0, max: 20, step: 1, default: 2 }
      ]
    },
    {
      category: 'segmentation',
      name: 'regionGrowing',
      icon: 'Sprout',
      description: '区域生长分割',
      params: [
        { name: 'seedX', label: '种子点X', type: 'range', min: 0, max: 1000, step: 1, default: 100 },
        { name: 'seedY', label: '种子点Y', type: 'range', min: 0, max: 1000, step: 1, default: 100 },
        { name: 'threshold', label: '相似阈值', type: 'range', min: 1, max: 100, step: 1, default: 20 }
      ]
    }
  ]
};

// 获取所有操作配置
export function getAllOperations(): OperationConfig[] {
  return Object.values(OPERATION_CONFIGS).flat();
}

// 根据类别获取操作配置
export function getOperationsByCategory(category: string): OperationConfig[] {
  return OPERATION_CONFIGS[category] || [];
}

// 根据名称获取操作配置
export function getOperationByName(name: string): OperationConfig | undefined {
  for (const ops of Object.values(OPERATION_CONFIGS)) {
    const op = ops.find(o => o.name === name);
    if (op) return op;
  }
  return undefined;
}
