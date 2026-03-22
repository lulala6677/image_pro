'use client';

import { useState, useCallback } from 'react';
import { Download, Undo2, GitCompareArrows, ZoomIn, ZoomOut, Maximize, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploader, ImageFile } from '@/components/image-uploader';
import { OperationPanel } from '@/components/operation-panel';
import { Histogram } from '@/components/histogram';
import { HistoryPanel, HistoryEntry, CompareView } from '@/components/history-panel';
import { BubblesBackground } from '@/components/ui/bubbles-background';
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

      // 更新处理后的图像
      const newProcessedImage: ProcessedImage = {
        id: result.id,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height
      };

      setProcessedImage(newProcessedImage);

      // 添加到历史记录
      const historyEntry: HistoryEntry = {
        id: result.id,
        operation: operation,
        params: params,
        thumbnail: result.dataUrl,
        timestamp: Date.now()
      };

      setHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
      setHistoryIndex(prev => prev + 1);

    } catch (error) {
      console.error('Processing error:', error);
      alert('处理失败: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, processedImage, historyIndex]);

  // 恢复历史
  const handleRestore = useCallback((id: string) => {
    const entry = history.find(h => h.id === id);
    if (entry) {
      setProcessedImage({
        id: entry.id,
        dataUrl: entry.thumbnail,
        width: 0,
        height: 0
      });
      setHistoryIndex(history.findIndex(h => h.id === id));
    }
  }, [history]);

  // 清除历史
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 重置图像
  const handleReset = useCallback(() => {
    setProcessedImage(null);
    setHistory([]);
    setHistoryIndex(-1);
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

  // 显示的图像
  const displayImage = processedImage || currentImage;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* 动态泡泡背景 */}
      <BubblesBackground />
      
      {/* 背景渐变层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 -z-10" />
      
      {/* 顶部工具栏 */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-lg opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
              <h1 className="text-2xl font-bold tracking-tight">ImagePro</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/60">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-light tracking-wide">数字图像处理平台</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!processedImage}
            className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            重置
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompare(true)}
            disabled={!processedImage || !currentImage}
            className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          >
            <GitCompareArrows className="h-4 w-4 mr-1.5" />
            对比
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!displayImage}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25"
          >
            <Download className="h-4 w-4 mr-1.5" />
            下载
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 min-h-0 flex relative z-10">
        {/* 左侧：操作面板 */}
        <div className="w-[260px] flex-shrink-0 border-r border-white/10 overflow-hidden bg-white/5 backdrop-blur-xl">
          <OperationPanel onApply={applyOperation} isProcessing={isProcessing} />
        </div>

        {/* 中间：图像预览 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* 缩放控制 */}
          <div className="flex items-center justify-center gap-3 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.max(10, z - 10))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-4 py-1 rounded-full bg-white/10 border border-white/20">
              <span className="text-sm text-white/80 font-medium">{zoom}%</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.min(200, z + 10))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setZoom(100)}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {/* 图像显示区 */}
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6">
            {displayImage ? (
              <div
                className="relative transition-transform duration-300 ease-out origin-center"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 blur-2xl rounded-3xl" />
                <img
                  src={displayImage.dataUrl}
                  alt=""
                  className="relative max-w-full max-h-[calc(100vh-220px)] object-contain rounded-2xl shadow-2xl shadow-black/50"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20">
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-sm text-white font-medium">处理中...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ImageUploader
                onImageLoad={setCurrentImage}
                currentImage={null}
              />
            )}
          </div>
        </div>

        {/* 右侧：直方图和历史 */}
        <div className="w-[260px] flex-shrink-0 border-l border-white/10 overflow-hidden bg-white/5 backdrop-blur-xl">
          <Tabs defaultValue="histogram" className="h-full w-full flex flex-col">
            <TabsList className="mx-4 mt-4 mb-2 flex-shrink-0 bg-white/10 border border-white/10 p-1">
              <TabsTrigger 
                value="histogram" 
                className="text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                直方图
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
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
    </div>
  );
}
