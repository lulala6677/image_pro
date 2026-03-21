// 图像处理类型定义

// 使用 ProcessImageData 避免与浏览器全局 ImageData 冲突
export interface ProcessImageData {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  file?: File;
}

// 保留 ImageData 作为别名，用于向后兼容
export type ImageData = ProcessImageData;

export interface ProcessingResult {
  id: string;
  originalId: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  operation: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  timestamp: number;
  thumbnail?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSI {
  h: number;
  s: number;
  i: number;
}

// 处理操作类型
export type GeometricOperation = 'resize' | 'rotate' | 'flip' | 'translate' | 'crop';
export type GrayscaleOperation = 'logarithm' | 'inverse' | 'gamma' | 'histogramEqualization' | 'linearTransform' | 'contrastStretch';
export type NoiseOperation = 'saltPepper' | 'gaussian' | 'speckle';
export type FilterOperation = 'blur' | 'sharpen' | 'median' | 'mean' | 'gaussianBlur' | 'bilateral';
export type EdgeOperation = 'sobel' | 'laplacian' | 'canny' | 'prewitt' | 'roberts' | 'log';
export type FrequencyOperation = 'fft' | 'lowpass' | 'highpass' | 'bandpass';
export type SegmentOperation = 'threshold' | 'otsu' | 'regionGrowing' | 'watershed';
export type ColorOperation = 'rgbToHsi' | 'hsiToRgb' | 'colorAdjust' | 'hueRotate';
export type AIOperation = 'superResolution' | 'styleTransfer' | 'backgroundRemoval' | 'faceDetect' | 'objectDetect';

export type OperationType = 
  | GeometricOperation 
  | GrayscaleOperation 
  | NoiseOperation 
  | FilterOperation 
  | EdgeOperation 
  | FrequencyOperation 
  | SegmentOperation 
  | ColorOperation
  | AIOperation;

// 操作参数接口
export interface ResizeParams {
  scaleX: number;
  scaleY: number;
  maintainAspect: boolean;
}

export interface RotateParams {
  angle: number;
  fillColor?: string;
}

export interface FlipParams {
  direction: 'horizontal' | 'vertical';
}

export interface TranslateParams {
  offsetX: number;
  offsetY: number;
  fillColor?: string;
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GammaParams {
  gamma: number;
}

export interface LinearTransformParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface SaltPepperParams {
  saltProb: number;
  pepperProb: number;
}

export interface GaussianNoiseParams {
  mean: number;
  variance: number;
}

export interface BlurParams {
  type: 'gaussian' | 'motion' | 'disk';
  radius: number;
  angle?: number;
  distance?: number;
}

export interface SharpenParams {
  type: 'roberts' | 'prewitt' | 'sobel' | 'laplacian' | 'log';
  strength: number;
  kernelSize?: number;
}

export interface FilterParams {
  type: 'median' | 'mean' | 'gaussian' | 'bilateral';
  kernelSize: number;
  sigma?: number;
}

export interface EdgeParams {
  type: 'sobel' | 'laplacian' | 'canny' | 'prewitt' | 'roberts' | 'log';
  threshold?: number;
  kernelSize?: number;
}

export interface FFTParams {
  mode: 'magnitude' | 'phase' | 'real' | 'imaginary';
}

export interface LowpassParams {
  type: 'ideal' | 'butterworth' | 'gaussian';
  cutoff: number;
  order?: number;
}

export interface HighpassParams {
  type: 'ideal' | 'butterworth' | 'gaussian';
  cutoff: number;
  order?: number;
}

export interface ThresholdParams {
  method: 'global' | 'otsu' | 'adaptive';
  threshold?: number;
  blockSize?: number;
  c?: number;
}

export interface RegionGrowParams {
  seedX: number;
  seedY: number;
  threshold: number;
}

export interface ColorAdjustParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

export interface HSIParams {
  channel: 'h' | 's' | 'i' | 'all';
}

export interface OperationConfig {
  category: string;
  name: string;
  icon: string;
  description: string;
  params: ParamConfig[];
}

export interface ParamConfig {
  name: string;
  label: string;
  type: 'number' | 'range' | 'select' | 'color' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  default: unknown;
  options?: { label: string; value: unknown }[];
}
