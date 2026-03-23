'use client';

import { useState, useCallback } from 'react';
import { Download, Undo2, GitCompareArrows, ZoomIn, ZoomOut, Maximize, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploader, ImageFile } from '@/components/image-uploader';
import { OperationPanel } from '@/components/operation-panel';
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
      const newProcessedImage: ProcessedImage = {
        id: newId,
        dataUrl: result.dataUrl,
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
        dataUrl: result.dataUrl,
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
  }, [currentImage, processedImage, historyIndex]);

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
      
      {/* 背景层 - 纯黑 */}
      <div className="absolute inset-0 bg-black -z-10" />
      
      {/* 顶部工具栏 */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* 虹彩发光效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-400 via-cyan-400 to-purple-500 blur-xl opacity-60 animate-pulse" />
            <div className="relative bg-gradient-to-r from-orange-400 via-yellow-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              <h1 className="text-2xl font-bold tracking-tight">ImagePro</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-light tracking-wide">数字图像处理平台</span>
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
            <div className="h-full w-full overflow-hidden bg-black/40 backdrop-blur-xl border-r border-white/10">
              <OperationPanel onApply={applyOperation} isProcessing={isProcessing} />
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
              </div>

              {/* 图像显示区 */}
              <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6">
                {displayImage ? (
                  <div
                    className="relative transition-transform duration-300 ease-out origin-center"
                    style={{ transform: `scale(${zoom / 100})` }}
                  >
                    {/* 虹彩光晕 */}
                    <div className="absolute -inset-6 bg-gradient-to-r from-orange-500/30 via-yellow-400/20 via-cyan-400/30 to-purple-500/30 blur-3xl rounded-3xl animate-pulse" />
                    <img
                      src={displayImage.dataUrl}
                      alt=""
                      className="relative max-w-full max-h-[calc(100vh-220px)] object-contain rounded-2xl shadow-2xl shadow-black/80"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        {/* 毛玻璃模糊效果 - 无文字 */}
                        <div className="absolute inset-0 backdrop-blur-2xl bg-white/5" />
                        {/* 额外的磨砂层 */}
                        <div 
                          className="absolute inset-0 opacity-30"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
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
                    onImageLoad={setCurrentImage}
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
    </div>
  );
}
