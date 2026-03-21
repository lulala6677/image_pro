'use client';

import { useState, useCallback } from 'react';
import { Download, Undo2, GitCompareArrows, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ImageUploader, ImageFile } from '@/components/image-uploader';
import { OperationPanel } from '@/components/operation-panel';
import { Histogram } from '@/components/histogram';
import { HistoryPanel, HistoryEntry, CompareView } from '@/components/history-panel';
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
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部工具栏 */}
      <header className="border-b px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            ImagePro
          </h1>
          <span className="text-xs text-muted-foreground">数字图像处理平台</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!processedImage}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompare(true)}
            disabled={!processedImage || !currentImage}
          >
            <GitCompareArrows className="h-4 w-4 mr-1" />
            对比
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={!displayImage}
          >
            <Download className="h-4 w-4 mr-1" />
            下载
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* 左侧：操作面板 */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <OperationPanel onApply={applyOperation} isProcessing={isProcessing} />
          </ResizablePanel>

          <ResizableHandle />

          {/* 中间：图像预览 */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              {/* 缩放控制 */}
              <div className="flex items-center justify-center gap-2 py-2 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(z => Math.max(10, z - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(z => Math.min(200, z + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(100)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>

              {/* 图像显示区 */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/30">
                {displayImage ? (
                  <div
                    className="relative transition-transform duration-200"
                    style={{ transform: `scale(${zoom / 100})` }}
                  >
                    <img
                      src={displayImage.dataUrl}
                      alt=""
                      className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-lg"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                        <div className="bg-background px-4 py-2 rounded-lg shadow-lg">
                          <span className="text-sm">处理中...</span>
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
          </ResizablePanel>

          <ResizableHandle />

          {/* 右侧：直方图和历史 */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <Tabs defaultValue="histogram" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="histogram" className="text-xs">直方图</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">历史</TabsTrigger>
              </TabsList>
              <TabsContent value="histogram" className="flex-1 m-0">
                <div className="p-4 h-full">
                  <Histogram dataUrl={displayImage?.dataUrl || ''} />
                </div>
              </TabsContent>
              <TabsContent value="history" className="flex-1 m-0">
                <div className="p-4 h-full">
                  <HistoryPanel
                    entries={history}
                    currentId={processedImage?.id}
                    onRestore={handleRestore}
                    onClear={handleClearHistory}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
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
