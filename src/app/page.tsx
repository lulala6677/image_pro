'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Undo2, GitCompareArrows, ZoomIn, ZoomOut, Maximize, Sparkles, RotateCcw, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploader, ImageFile } from '@/components/image-uploader';
import { ImageSourceDialog } from '@/components/image-source-dialog';
import { OperationPanel } from '@/components/operation-panel';
import { AIProcessingPanel } from '@/components/ai-processing-panel';
import { Histogram } from '@/components/histogram';
import { HistoryPanel, HistoryEntry, CompareView } from '@/components/history-panel';
import { BubblesBackground } from '@/components/ui/bubbles-background';
import { PanelLayout } from '@/components/ui/panel-layout';
import { 
  resize, rotate, flip, translate,
  toGrayscale, binary, logarithmicTransform, inverseTransform, gammaTransform,
  histogramEqualization, linearTransform, contrastStretch,
  addSaltPepperNoise, addGaussianNoise,
  gaussianBlur, medianFilter, meanFilter, motionBlur, sharpenFilter, bilateralFilter,
  detectEdge,
  adjustColor, hueRotate, rgbToHsiImage,
  applyThreshold, regionGrowing,
  ProcessImageData
} from '@/lib/image-processing';
import { applySelectionMask } from '@/lib/image-processing/selection-apply';
import type { SelectionData, SelectionToolType, Point, WandToolParams, LassoToolParams } from '@/lib/selection/types';
import { magicWandSelect, lassoSelect, createSelectionOverlay, rectangleSelect, ellipseSelect } from '@/lib/selection/selection-utils';

// 生成唯一ID
const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 存储处理后的图像
interface ProcessedImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
}

export default function ImageProcessorPage() {
  const [currentImage, setCurrentImage] = useState<ImageFile | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showReveal, setShowReveal] = useState(false); // 揭示动画状态
  const [showReplaceDialog, setShowReplaceDialog] = useState(false); // 更换图片弹窗
  const [isComparing, setIsComparing] = useState(false); // 按住对比状态
  
  // 选区工具状态
  const [activeTool, setActiveTool] = useState<SelectionToolType>('none');
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<string | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  // 矩形/椭圆选区绘制状态
  const [shapeStartPoint, setShapeStartPoint] = useState<Point | null>(null);
  const [shapeEndPoint, setShapeEndPoint] = useState<Point | null>(null);
  const [wandParams, setWandParams] = useState<WandToolParams>({
    tolerance: 32,
    contiguous: true,
    invert: false,
  });
  const [lassoParams, setLassoParams] = useState<LassoToolParams>({
    feather: 0,
    invert: false,
  });
  
  // 像素颜色信息显示
  const [pixelColorInfo, setPixelColorInfo] = useState<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  
  // 显示的图像 - 按住对比时显示原图
  const displayImage = isComparing && processedImage ? currentImage : (processedImage || currentImage);
  
  // 图像显示尺寸（用于坐标转换）
  const imageDisplayRef = useRef<HTMLDivElement>(null);
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 });
  
  // 更新图像显示尺寸
  useEffect(() => {
    const updateSize = () => {
      if (imageDisplayRef.current) {
        const rect = imageDisplayRef.current.getBoundingClientRect();
        setImageDisplaySize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [displayImage]);
  
  // 更新选区可视化
  useEffect(() => {
    if (selection && displayImage) {
      const overlay = createSelectionOverlay(selection, displayImage.width, displayImage.height);
      setSelectionOverlay(overlay);
    } else {
      setSelectionOverlay(null);
    }
  }, [selection, displayImage]);
  
  // 工具切换时隐藏颜色信息
  useEffect(() => {
    if (activeTool !== 'wand') {
      setPixelColorInfo(null);
    }
  }, [activeTool]);
  
  // 坐标转换：屏幕坐标 -> 图像坐标
  const screenToImageCoords = useCallback((screenX: number, screenY: number): { x: number; y: number } | null => {
    if (!displayImage || !imageDisplayRef.current) return null;
    
    const imgElement = imageDisplayRef.current.querySelector('img');
    if (!imgElement) return null;
    
    const imgRect = imgElement.getBoundingClientRect();
    
    // 相对于图像元素的位置
    const relX = screenX - imgRect.left;
    const relY = screenY - imgRect.top;
    
    // 转换为图像坐标
    const x = Math.floor((relX / imgRect.width) * displayImage.width);
    const y = Math.floor((relY / imgRect.height) * displayImage.height);
    
    // 边界检查
    if (x < 0 || x >= displayImage.width || y < 0 || y >= displayImage.height) {
      return null;
    }
    
    return { x, y };
  }, [displayImage]);
  
  // 获取图像像素数据
  const getImagePixelData = useCallback(async (): Promise<ImageData | null> => {
    if (!displayImage) return null;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = displayImage.width;
        canvas.height = displayImage.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
      };
      img.src = displayImage.dataUrl;
    });
  }, [displayImage]);
  
  // 魔棒工具点击处理
  const handleWandClick = useCallback(async (x: number, y: number, screenX: number, screenY: number) => {
    if (!displayImage) return;
    
    const pixelData = await getImagePixelData();
    if (!pixelData) return;
    
    // 获取像素颜色
    const pixelIndex = (y * pixelData.width + x) * 4;
    const r = pixelData.data[pixelIndex];
    const g = pixelData.data[pixelIndex + 1];
    const b = pixelData.data[pixelIndex + 2];
    
    // 显示颜色信息
    setPixelColorInfo({ x, y, r, g, b, screenX, screenY });
    
    // 执行魔棒选择
    const newSelection = magicWandSelect(pixelData, x, y, wandParams);
    
    setSelection(newSelection);
  }, [displayImage, getImagePixelData, wandParams]);
  
  // 套索工具处理
  const handleLassoStart = useCallback((x: number, y: number) => {
    setLassoPoints([{ x, y }]);
    setIsDrawing(true);
  }, []);
  
  const handleLassoMove = useCallback((x: number, y: number) => {
    setLassoPoints(prev => {
      if (prev.length === 0) return [{ x, y }];
      const lastPoint = prev[prev.length - 1];
      // 只在移动一定距离后添加新点
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) return prev;
      return [...prev, { x, y }];
    });
  }, []);
  
  const handleLassoEnd = useCallback(() => {
    setIsDrawing(false);
    
    setLassoPoints(prevPoints => {
      if (prevPoints.length < 3 || !displayImage) {
        return [];
      }
      
      // 闭合多边形
      const closedPoints = [...prevPoints, prevPoints[0]];
      const newSelection = lassoSelect(displayImage.width, displayImage.height, closedPoints, lassoParams);
      
      setSelection(newSelection);
      return [];
    });
  }, [displayImage, lassoParams]);
  
  // 矩形/椭圆选区工具处理
  const handleShapeStart = useCallback((x: number, y: number) => {
    setShapeStartPoint({ x, y });
    setShapeEndPoint({ x, y });
    setIsDrawing(true);
  }, []);
  
  const handleShapeMove = useCallback((x: number, y: number) => {
    if (isDrawing && shapeStartPoint) {
      setShapeEndPoint({ x, y });
    }
  }, [isDrawing, shapeStartPoint]);
  
  const handleShapeEnd = useCallback(() => {
    setIsDrawing(false);
    
    if (!displayImage || !shapeStartPoint || !shapeEndPoint) {
      setShapeStartPoint(null);
      setShapeEndPoint(null);
      return;
    }
    
    let newSelection: SelectionData;
    
    if (activeTool === 'rectangle') {
      newSelection = rectangleSelect(
        displayImage.width,
        displayImage.height,
        shapeStartPoint.x,
        shapeStartPoint.y,
        shapeEndPoint.x,
        shapeEndPoint.y
      );
    } else if (activeTool === 'ellipse') {
      newSelection = ellipseSelect(
        displayImage.width,
        displayImage.height,
        shapeStartPoint.x,
        shapeStartPoint.y,
        shapeEndPoint.x,
        shapeEndPoint.y
      );
    } else {
      setShapeStartPoint(null);
      setShapeEndPoint(null);
      return;
    }
    
    setSelection(newSelection);
    setShapeStartPoint(null);
    setShapeEndPoint(null);
  }, [displayImage, shapeStartPoint, shapeEndPoint, activeTool]);
  
  // 清除选区
  const handleClearSelection = useCallback(() => {
    setSelection(null);
    setSelectionOverlay(null);
    setActiveTool('none');
    setLassoPoints([]);
    setIsDrawing(false);
    setShapeStartPoint(null);
    setShapeEndPoint(null);
  }, []);

  // 转换图像格式
  const toProcessImageData = (img: ImageFile | ProcessedImage): ProcessImageData => ({
    id: img.id,
    name: 'name' in img ? img.name : 'processed',
    dataUrl: img.dataUrl,
    width: img.width,
    height: img.height
  });

  // 处理操作映射
  const applyOperation = useCallback(async (operation: string, params: Record<string, unknown>) => {
    const sourceImage = processedImage || currentImage;
    if (!sourceImage) return;

    setIsProcessing(true);
    
    try {
      // 使用 setTimeout 让 UI 更新
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const imageData = toProcessImageData(sourceImage);
      let result: ProcessImageData;

      switch (operation) {
        // 几何变换
        case 'resize':
          result = resize(imageData, {
            scaleX: params.scaleX as number,
            scaleY: params.scaleY as number,
            maintainAspect: params.maintainAspect as boolean
          });
          break;
        case 'rotate':
          result = rotate(imageData, {
            angle: params.angle as number,
            fillColor: params.fillColor as string
          });
          break;
        case 'flip':
          result = flip(imageData, {
            direction: params.direction as 'horizontal' | 'vertical'
          });
          break;
        case 'translate':
          result = translate(imageData, {
            offsetX: params.offsetX as number,
            offsetY: params.offsetY as number,
            fillColor: params.fillColor as string
          });
          break;

        // 灰度变换
        case 'toGrayscale':
          result = toGrayscale(imageData);
          break;
        case 'binary':
          result = binary(imageData, params.threshold as number);
          break;
        case 'logarithmicTransform':
          result = logarithmicTransform(imageData);
          break;
        case 'inverseTransform':
          result = inverseTransform(imageData);
          break;
        case 'gammaTransform':
          result = gammaTransform(imageData, { gamma: params.gamma as number });
          break;
        case 'histogramEqualization':
          result = histogramEqualization(imageData);
          break;
        case 'linearTransform':
          result = linearTransform(imageData, {
            a: params.a as number,
            b: params.b as number,
            c: params.c as number,
            d: params.d as number
          });
          break;
        case 'contrastStretch':
          result = contrastStretch(imageData);
          break;

        // 噪声处理
        case 'addSaltPepperNoise':
          result = addSaltPepperNoise(imageData, {
            saltProb: params.saltProb as number,
            pepperProb: params.pepperProb as number
          });
          break;
        case 'addGaussianNoise':
          result = addGaussianNoise(imageData, {
            mean: params.mean as number,
            variance: params.variance as number
          });
          break;

        // 滤波处理
        case 'gaussianBlur':
          result = gaussianBlur(imageData, {
            radius: params.radius as number,
            sigma: params.sigma as number
          });
          break;
        case 'medianFilter':
          result = medianFilter(imageData, { kernelSize: params.kernelSize as number });
          break;
        case 'meanFilter':
          result = meanFilter(imageData, { kernelSize: params.kernelSize as number });
          break;
        case 'motionBlur':
          result = motionBlur(imageData, {
            distance: params.distance as number,
            angle: params.angle as number
          });
          break;
        case 'sharpenFilter':
          result = sharpenFilter(imageData, {
            type: 'laplacian',
            strength: params.strength as number
          });
          break;
        case 'bilateralFilter':
          result = bilateralFilter(imageData, {
            kernelSize: params.kernelSize as number,
            sigmaSpace: params.sigmaSpace as number,
            sigmaColor: params.sigmaColor as number
          });
          break;

        // 边缘检测
        case 'detectEdge':
          result = detectEdge(imageData, {
            type: params.type as 'sobel' | 'laplacian' | 'prewitt' | 'roberts' | 'log' | 'canny',
            threshold: params.threshold as number
          });
          break;

        // 颜色调整
        case 'adjustColor':
          result = adjustColor(imageData, {
            brightness: params.brightness as number,
            contrast: params.contrast as number,
            saturation: params.saturation as number,
            hue: params.hue as number
          });
          break;
        case 'hueRotate':
          result = hueRotate(imageData, params.angle as number);
          break;
        case 'rgbToHsiImage':
          result = rgbToHsiImage(imageData, {
            channel: params.channel as 'h' | 's' | 'i' | 'all'
          });
          break;

        // 图像分割
        case 'applyThreshold':
          result = applyThreshold(imageData, {
            method: params.method as 'global' | 'otsu' | 'adaptive',
            threshold: params.threshold as number,
            blockSize: params.blockSize as number,
            c: params.c as number
          });
          break;
        case 'regionGrowing':
          result = regionGrowing(imageData, {
            seedX: params.seedX as number,
            seedY: params.seedY as number,
            threshold: params.threshold as number
          });
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // 更新处理后的图像 - 生成新的唯一ID避免冲突
      const newId = generateId();
      
      // 如果有选区，需要将处理结果与原图混合
      let finalDataUrl = result.dataUrl;
      
      // 调试：检查选区状态
      console.log('选区状态:', selection ? {
        hasMask: !!selection.mask,
        maskLength: selection.mask?.length,
        maskWidth: selection.mask?.[0]?.length,
        boundsWidth: selection.bounds.width,
        boundsHeight: selection.bounds.height,
        resultSize: `${result.width}x${result.height}`
      } : 'null');
      
      if (selection && selection.mask && selection.mask.length > 0 && selection.bounds.width > 0) {
        // 检查尺寸是否匹配
        const maskHeight = selection.mask.length;
        const maskWidth = selection.mask[0]?.length || 0;
        
        if (maskWidth !== result.width || maskHeight !== result.height) {
          console.warn('选区尺寸与图像不匹配，跳过选区应用:', {
            maskSize: `${maskWidth}x${maskHeight}`,
            imageSize: `${result.width}x${result.height}`
          });
        } else {
          console.log('应用选区混合...');
        
          // 加载原图和处理后的图像
          const originalImg = new Image();
          const processedImg = new Image();
          
          await new Promise<void>((resolve, reject) => {
            let loaded = 0;
            let hasError = false;
            const checkLoaded = () => {
              loaded++;
              if (loaded === 2) {
                if (hasError) {
                  reject(new Error('图片加载失败'));
                } else {
                  resolve();
                }
              }
            };
            const handleError = (type: string) => {
              console.error(`${type}图片加载失败`);
              hasError = true;
              checkLoaded();
            };
            
            originalImg.onload = checkLoaded;
            originalImg.onerror = () => handleError('原图');
            processedImg.onload = checkLoaded;
            processedImg.onerror = () => handleError('处理后图片');
            originalImg.src = sourceImage.dataUrl;
            processedImg.src = result.dataUrl;
          }).catch(err => {
            console.error('图片加载错误:', err);
            // 如果加载失败，使用处理后的结果
            return;
          });
          
          // 创建画布进行混合
          const canvas = document.createElement('canvas');
          canvas.width = result.width;
          canvas.height = result.height;
          const ctx = canvas.getContext('2d')!;
          
          // 填充白色背景
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // 获取原始像素数据
          ctx.drawImage(originalImg, 0, 0);
          const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // 创建临时画布获取处理后像素数据
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = result.width;
          tempCanvas.height = result.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          
          // 填充白色背景
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(processedImg, 0, 0);
          const processedData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
          
          // 应用选区混合
          const mixedData = applySelectionMask(originalData, processedData, selection);
          
          // 输出结果
          ctx.putImageData(mixedData, 0, 0);
          finalDataUrl = canvas.toDataURL();
          console.log('选区混合完成');
        }
      }
      
      const newProcessedImage: ProcessedImage = {
        id: newId,
        dataUrl: finalDataUrl,
        width: result.width,
        height: result.height
      };

      // 显示揭示动画
      setShowReveal(true);
      
      // 短暂延迟后设置新图片，让用户看到揭示动画
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setProcessedImage(newProcessedImage);

      // 添加到历史记录
      const historyEntry: HistoryEntry = {
        id: newId,
        operation: operation,
        params: params,
        dataUrl: finalDataUrl,  // 使用应用选区后的最终结果
        width: result.width,
        height: result.height,
        timestamp: Date.now()
      };

      setHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
      setHistoryIndex(prev => prev + 1);

    } catch (error) {
      console.error('Processing error:', error);
      alert('处理失败: ' + (error as Error).message);
      setShowReveal(false);
    } finally {
      setIsProcessing(false);
      // 揭示动画持续1秒后消失
      setTimeout(() => setShowReveal(false), 1000);
    }
  }, [currentImage, processedImage, historyIndex, selection]);

  // 恢复历史
  const handleRestore = useCallback((id: string) => {
    const entry = history.find(h => h.id === id);
    if (entry) {
      setProcessedImage({
        id: entry.id,
        dataUrl: entry.dataUrl,
        width: entry.width,
        height: entry.height
      });
      setHistoryIndex(history.findIndex(h => h.id === id));
    }
  }, [history]);

  // 清除历史
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 撤销上一步操作
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setProcessedImage({
        id: prevEntry.id,
        dataUrl: prevEntry.dataUrl,
        width: prevEntry.width,
        height: prevEntry.height
      });
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      // 撤销到原始图片
      setProcessedImage(null);
      setHistoryIndex(-1);
    }
  }, [history, historyIndex]);

  // 重置图像
  const handleReset = useCallback(() => {
    setProcessedImage(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 加载新图片（更换图片时清除所有处理状态）
  const handleNewImage = useCallback((image: ImageFile) => {
    setCurrentImage(image);
    // 清除处理后的图片
    setProcessedImage(null);
    // 清除历史记录
    setHistory([]);
    setHistoryIndex(-1);
    // 清除选区
    setSelection(null);
    setSelectionOverlay(null);
    setLassoPoints([]);
    setIsDrawing(false);
    setShapeStartPoint(null);
    setShapeEndPoint(null);
    // 重置缩放
    setZoom(100);
  }, []);

  // 处理更换图片（从弹窗拍摄或导入）
  const handleReplaceImage = useCallback((dataUrl: string, width: number, height: number) => {
    // 重置所有状态
    setCurrentImage(null);
    setProcessedImage(null);
    setHistory([]);
    setHistoryIndex(-1);
    setSelection(null);
    setSelectionOverlay(null);
    setPixelColorInfo(null);
    setLassoPoints([]);
    setShapeStartPoint(null);
    setShapeEndPoint(null);
    setIsDrawing(false);
    setZoom(100);
    
    // 设置新图片
    const imageData: ImageFile = {
      id: generateId(),
      dataUrl,
      width,
      height,
      name: `photo-${Date.now()}.jpg`,
    };
    setCurrentImage(imageData);
    setHistory([{
      id: imageData.id,
      operation: '上传图片',
      params: {},
      timestamp: Date.now(),
      dataUrl: imageData.dataUrl,
      width: imageData.width,
      height: imageData.height,
    }]);
    setHistoryIndex(0);
  }, []);

  // 下载图像
  const handleDownload = useCallback(() => {
    const image = processedImage || currentImage;
    if (!image) return;

    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `processed_${Date.now()}.png`;
    link.click();
  }, [processedImage, currentImage]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* 动态泡泡背景 */}
      <BubblesBackground />
      
      {/* 背景层 - 纯黑 */}
      <div className="absolute inset-0 bg-black -z-10" />
      
      {/* 像素颜色信息显示 - 放在顶层确保 fixed 定位正确 */}
      {pixelColorInfo && activeTool === 'wand' && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: pixelColorInfo.screenX + 10,
            top: pixelColorInfo.screenY + 10,
            transform: 'translateZ(0)',
          }}
        >
          <div className="bg-black/95 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-2.5 min-w-[100px]">
            <div className="flex items-start gap-2">
              {/* 颜色预览块 - 正方形 */}
              <div 
                className="w-7 h-7 rounded-md border border-white/20 flex-shrink-0 shadow-inner"
                style={{ backgroundColor: `rgb(${pixelColorInfo.r}, ${pixelColorInfo.g}, ${pixelColorInfo.b})` }}
              />
              
              <div className="flex-1 min-w-0">
                {/* 坐标 */}
                <div className="text-[11px] text-white/70 font-bold font-mono leading-tight antialiased tracking-wide">
                  {pixelColorInfo.x}, {pixelColorInfo.y}
                </div>
                
                {/* HEX 值 */}
                <div className="text-[11px] text-white font-bold font-mono leading-tight mt-1 antialiased tracking-wide">
                  #{pixelColorInfo.r.toString(16).padStart(2, '0').toUpperCase()}
                  {pixelColorInfo.g.toString(16).padStart(2, '0').toUpperCase()}
                  {pixelColorInfo.b.toString(16).padStart(2, '0').toUpperCase()}
                </div>
              </div>
            </div>
            
            {/* RGB 值 - 紧凑显示 */}
            <div className="text-[11px] text-white font-bold font-mono mt-2 flex justify-between antialiased tracking-wide">
              <span><span className="text-red-400">R</span> {pixelColorInfo.r}</span>
              <span><span className="text-green-400">G</span> {pixelColorInfo.g}</span>
              <span><span className="text-blue-400">B</span> {pixelColorInfo.b}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 顶部工具栏 */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* 虹彩发光效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-400 via-cyan-400 to-purple-500 blur-xl opacity-60 animate-pulse" />
            <div className="relative bg-gradient-to-r from-orange-400 via-yellow-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              <h1 className="text-2xl font-bold tracking-tight">ImageStu</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-light tracking-wide">数字图像处理实验室</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 撤销按钮 - 有处理历史时显示 */}
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              撤销
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!processedImage}
            className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            重置
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompare(true)}
            disabled={!processedImage || !currentImage}
            className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
          >
            <GitCompareArrows className="h-4 w-4 mr-1.5" />
            对比
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!displayImage}
            className="bg-gradient-to-r from-orange-500 via-yellow-500 to-cyan-500 hover:from-orange-400 hover:via-yellow-400 hover:to-cyan-400 text-black font-medium border-0 shadow-lg shadow-orange-500/30"
          >
            <Download className="h-4 w-4 mr-1.5" />
            下载
          </Button>
        </div>
      </header>

      {/* 主内容区 - 可调整大小 */}
      <div className="flex-1 min-h-0 relative z-10">
        <PanelLayout
          defaultLeftWidth={260}
          defaultRightWidth={260}
          minLeftWidth={200}
          maxLeftWidth={400}
          minRightWidth={200}
          maxRightWidth={400}
          leftPanel={
            <div className="h-full w-full overflow-y-auto bg-black/40 backdrop-blur-xl border-r border-white/10">
              <Tabs defaultValue="basic" className="h-full flex flex-col">
                <TabsList className="w-full grid grid-cols-2 bg-black/40 border-b border-white/10 rounded-none h-auto p-1">
                  <TabsTrigger 
                    value="basic" 
                    className="flex items-center gap-2 text-xs py-2 text-white/80 data-[state=active]:bg-white/10"
                  >
                    <svg className="h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                    基础处理
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai" 
                    className="flex items-center gap-2 text-xs py-2 text-white/80 data-[state=active]:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    AI 智能
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="flex-1 mt-0">
                  <OperationPanel 
                    onApply={applyOperation} 
                    isProcessing={isProcessing}
                    imageWidth={displayImage?.width}
                    imageHeight={displayImage?.height}
                    selection={selection}
                    onSelectionChange={setSelection}
                    activeTool={activeTool}
                    onActiveToolChange={setActiveTool}
                    wandParams={wandParams}
                    onWandParamsChange={setWandParams}
                    lassoParams={lassoParams}
                    onLassoParamsChange={setLassoParams}
                  />
                </TabsContent>
                <TabsContent value="ai" className="flex-1 mt-0">
                  <AIProcessingPanel
                    imageUrl={displayImage?.dataUrl}
                    selection={selection}
                    onProcess={(resultUrl, operation) => {
                      // 处理 AI 返回的结果
                      const newId = generateId();
                      const img = new Image();
                      img.onload = () => {
                        const newProcessedImage: ProcessedImage = {
                          id: newId,
                          dataUrl: resultUrl,
                          width: img.width,
                          height: img.height
                        };
                        setShowReveal(true);
                        setTimeout(() => setShowReveal(false), 1000);
                        setProcessedImage(newProcessedImage);
                        
                        // 添加到历史记录
                        const historyEntry: HistoryEntry = {
                          id: newId,
                          operation: operation,
                          params: {},
                          dataUrl: resultUrl,
                          width: img.width,
                          height: img.height,
                          timestamp: Date.now()
                        };
                        setHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
                        setHistoryIndex(prev => prev + 1);
                      };
                      img.src = resultUrl;
                    }}
                    isProcessing={isProcessing}
                    onProcessingChange={setIsProcessing}
                  />
                </TabsContent>
              </Tabs>
            </div>
          }
          centerPanel={
            <div className="h-full w-full flex flex-col overflow-hidden bg-black/20">
              {/* 缩放控制 */}
              <div className="flex items-center justify-center gap-3 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                  onClick={() => setZoom(z => Math.max(10, z - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-sm text-white/70 font-medium">{zoom}%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                  onClick={() => setZoom(z => Math.min(200, z + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                  onClick={() => setZoom(100)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                {/* 分隔线 */}
                <div className="w-px h-6 bg-white/10 mx-1" />
                {/* 按住对比按键 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 transition-all",
                    isComparing 
                      ? "text-orange-400 bg-orange-400/20" 
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  )}
                  onMouseDown={() => processedImage && setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => processedImage && setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  disabled={!processedImage}
                  title="按住查看原图"
                >
                  <GitCompareArrows className="h-4 w-4" />
                </Button>
              </div>

              {/* 图像显示区 */}
              <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6 relative">
                {/* 更换图片按钮 - 从左侧滑入动画 */}
                {displayImage && (
                  <button
                    onClick={() => setShowReplaceDialog(true)}
                    className="absolute top-4 right-4 z-20 cursor-pointer animate-replace-button"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-orange-400/50 via-amber-300/40 to-orange-500/50 backdrop-blur-xl border border-white/20 text-white/90 hover:from-orange-400/60 hover:via-amber-400/50 hover:to-orange-500/60 hover:text-white hover:border-white/30 transition-all shadow-lg">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">更换图片</span>
                    </div>
                  </button>
                )}
                
                {displayImage ? (
                  <div
                    ref={imageDisplayRef}
                    className="relative transition-transform duration-300 ease-out origin-center"
                    style={{ transform: `scale(${zoom / 100})`, cursor: activeTool !== 'none' ? 'crosshair' : 'default' }}
                    onClick={(e) => {
                      if (activeTool === 'wand') {
                        const coords = screenToImageCoords(e.clientX, e.clientY);
                        if (coords) handleWandClick(coords.x, coords.y, e.clientX, e.clientY);
                      } else {
                        // 点击其他地方时隐藏颜色信息
                        setPixelColorInfo(null);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (activeTool === 'lasso') {
                        e.preventDefault();
                        const coords = screenToImageCoords(e.clientX, e.clientY);
                        if (coords) handleLassoStart(coords.x, coords.y);
                      } else if (activeTool === 'rectangle' || activeTool === 'ellipse') {
                        e.preventDefault();
                        const coords = screenToImageCoords(e.clientX, e.clientY);
                        if (coords) handleShapeStart(coords.x, coords.y);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (activeTool === 'lasso' && isDrawing) {
                        const coords = screenToImageCoords(e.clientX, e.clientY);
                        if (coords) handleLassoMove(coords.x, coords.y);
                      } else if ((activeTool === 'rectangle' || activeTool === 'ellipse') && isDrawing) {
                        const coords = screenToImageCoords(e.clientX, e.clientY);
                        if (coords) handleShapeMove(coords.x, coords.y);
                      }
                    }}
                    onMouseUp={() => {
                      if (activeTool === 'lasso') handleLassoEnd();
                      else if (activeTool === 'rectangle' || activeTool === 'ellipse') handleShapeEnd();
                    }}
                    onMouseLeave={() => {
                      if (activeTool === 'lasso' && isDrawing) handleLassoEnd();
                      else if ((activeTool === 'rectangle' || activeTool === 'ellipse') && isDrawing) handleShapeEnd();
                    }}
                  >
                    {/* 虹彩光晕 */}
                    <div className="absolute -inset-6 bg-gradient-to-r from-orange-500/30 via-yellow-400/20 via-cyan-400/30 to-purple-500/30 blur-3xl rounded-3xl animate-pulse" />
                    {displayImage?.dataUrl && (
                      <img
                        src={displayImage.dataUrl}
                        alt=""
                        className="relative max-w-full max-h-[calc(100vh-220px)] object-contain rounded-2xl shadow-2xl shadow-black/80"
                        style={{ pointerEvents: 'none' }}
                        onError={(e) => {
                          // 防止图片加载失败时触发沙箱环境的默认错误行为
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    
                    {/* 选区覆盖层 */}
                    {selectionOverlay && (
                      <img
                        src={selectionOverlay}
                        alt=""
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ mixBlendMode: 'normal' }}
                        onError={(e) => {
                          // 防止图片加载失败时触发沙箱环境的默认错误行为
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    
                    {/* 套索绘制路径 */}
                    {lassoPoints.length > 0 && (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${displayImage.width} ${displayImage.height}`}
                      >
                        <polyline
                          points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.9)"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      </svg>
                    )}
                    
                    {/* 矩形/椭圆选区绘制预览 */}
                    {(activeTool === 'rectangle' || activeTool === 'ellipse') && isDrawing && shapeStartPoint && shapeEndPoint && displayImage && (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${displayImage.width} ${displayImage.height}`}
                      >
                        {activeTool === 'rectangle' ? (
                          <rect
                            x={Math.min(shapeStartPoint.x, shapeEndPoint.x)}
                            y={Math.min(shapeStartPoint.y, shapeEndPoint.y)}
                            width={Math.abs(shapeEndPoint.x - shapeStartPoint.x)}
                            height={Math.abs(shapeEndPoint.y - shapeStartPoint.y)}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="rgba(255, 255, 255, 0.9)"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        ) : (
                          <ellipse
                            cx={(shapeStartPoint.x + shapeEndPoint.x) / 2}
                            cy={(shapeStartPoint.y + shapeEndPoint.y) / 2}
                            rx={Math.abs(shapeEndPoint.x - shapeStartPoint.x) / 2}
                            ry={Math.abs(shapeEndPoint.y - shapeStartPoint.y) / 2}
                            fill="rgba(236, 72, 153, 0.2)"
                            stroke="rgba(255, 255, 255, 0.9)"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        )}
                      </svg>
                    )}
                    
                    {isProcessing && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        {/* 强模糊层 */}
                        <div className="absolute inset-0 backdrop-blur-3xl" />
                        {/* 水纹玻璃纹理层 - 高透明度 */}
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: `
                              radial-gradient(ellipse 100% 50% at 25% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
                              radial-gradient(ellipse 80% 60% at 75% 70%, rgba(255,255,255,0.06) 0%, transparent 50%)
                            `,
                          }}
                        />
                        {/* 压花玻璃纹理 - 水波涟漪效果 */}
                        <div 
                          className="absolute inset-0 opacity-50"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='ripple'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='2' seed='5' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23f0f0f0' surfaceScale='3'%3E%3CfeDistantLight azimuth='225' elevation='50'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23ripple)'/%3E%3C/svg%3E")`,
                            mixBlendMode: 'overlay',
                          }}
                        />
                        {/* 细密水珠纹理 */}
                        <div 
                          className="absolute inset-0 opacity-35"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='droplets'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.04' numOctaves='3' seed='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23droplets)' fill='%23ffffff'/%3E%3C/svg%3E")`,
                            mixBlendMode: 'soft-light',
                          }}
                        />
                      </div>
                    )}
                    
                    {/* 处理完成揭示动画 - 从左向右去除模糊 */}
                    {showReveal && !isProcessing && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.3) 90%, rgba(0,0,0,0.1) 100%)',
                            animation: 'reveal-clear 1.2s ease-out forwards',
                          }}
                        />
                        {/* 虹彩边缘光效 */}
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, transparent 28%, rgba(251,146,60,0.4) 30%, rgba(250,204,21,0.3) 35%, rgba(34,211,238,0.2) 40%, transparent 42%)',
                            animation: 'reveal-edge 1.2s ease-out forwards',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <ImageUploader
                    onImageLoad={handleNewImage}
                    currentImage={null}
                  />
                )}
              </div>
            </div>
          }
          rightPanel={
            <div className="h-full w-full overflow-hidden bg-black/40 backdrop-blur-xl border-l border-white/10">
              <Tabs defaultValue="histogram" className="h-full w-full flex flex-col">
                <TabsList className="mx-4 mt-4 mb-2 flex-shrink-0 bg-white/5 border border-white/10 p-1">
                  <TabsTrigger 
                    value="histogram" 
                    className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/30 data-[state=active]:to-cyan-500/30 data-[state=active]:text-white text-white/50"
                  >
                    直方图
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/30 data-[state=active]:to-cyan-500/30 data-[state=active]:text-white text-white/50"
                  >
                    历史
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="histogram" className="flex-1 min-h-0 m-0 overflow-auto">
                  <Histogram dataUrl={displayImage?.dataUrl || ''} />
                </TabsContent>
                <TabsContent value="history" className="flex-1 min-h-0 m-0 overflow-auto">
                  <HistoryPanel
                    entries={history}
                    currentId={processedImage?.id}
                    onRestore={handleRestore}
                    onClear={handleClearHistory}
                  />
                </TabsContent>
              </Tabs>
            </div>
          }
        />
      </div>

      {/* 对比视图 */}
      {showCompare && currentImage && processedImage && (
        <CompareView
          original={currentImage.dataUrl}
          processed={processedImage.dataUrl}
          onClose={() => setShowCompare(false)}
          onDownload={handleDownload}
        />
      )}

      {/* 更换图片弹窗 */}
      <ImageSourceDialog
        open={showReplaceDialog}
        onClose={() => setShowReplaceDialog(false)}
        onImageCapture={handleReplaceImage}
      />
    </div>
  );
}
