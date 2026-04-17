'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Expand, Palette, Eraser, Cpu, Zap, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

// 选区数据类型
interface SelectionData {
  mask?: boolean[][];
  bounds?: { x: number; y: number; width: number; height: number };
}

interface AIProcessingPanelProps {
  imageUrl?: string;
  onProcess: (resultUrl: string, operation: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  selection?: SelectionData | null;
}

export function AIProcessingPanel({
  imageUrl,
  onProcess,
  isProcessing,
  onProcessingChange,
  selection
}: AIProcessingPanelProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpuStatus, setGpuStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [expandScale, setExpandScale] = useState(1.5);
  const styleInputRef = useRef<HTMLInputElement>(null);

  // 检查 WebGPU 可用性
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const webgpu = navigator.gpu;
      if (webgpu) {
        setGpuStatus('available');
      } else {
        setGpuStatus('unavailable');
      }
    }
  }, []);

  const aiTools = [
    {
      id: 'denoise',
      name: '智能去噪',
      icon: Wand2,
      description: 'AI 一键去除图像噪点，增强清晰度',
      color: 'from-violet-400 to-purple-500',
      tips: '保持原图内容不变，仅去除噪点'
    },
    {
      id: 'expand',
      name: '智能扩图',
      icon: Expand,
      description: '扩展图像边界，自然延展画面',
      color: 'from-blue-400 to-cyan-500',
      tips: '保持原图内容不变，只扩展边界'
    },
    {
      id: 'style_transfer',
      name: '风格迁移',
      icon: Palette,
      description: '上传艺术图，将风格应用到当前图片',
      color: 'from-pink-400 to-rose-500',
      tips: '保持原图内容，只改变艺术风格'
    },
    {
      id: 'inpaint',
      name: '内容填充',
      icon: Eraser,
      description: '智能去除不需要的内容并自然填充',
      color: 'from-amber-400 to-orange-500',
      tips: '需先使用选区工具选择要填充的区域'
    }
  ];

  const handleStyleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setStyleImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 扩图处理
  const handleExpand = async (scale: number) => {
    if (!imageUrl) return;

    setActiveTool('expand');
    setError(null);
    onProcessingChange(true);

    try {
      const expandPrompt = prompt || 
        `Extend this image outward to create a wider, expanded view. ` +
        `The original content in the center must remain unchanged. ` +
        `Generate new natural content at the edges that seamlessly continues the scene. ` +
        `Match the lighting, colors, textures, and atmosphere of the original image. ` +
        `The result should look like the original scene captured with a wider angle lens.`;

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'expand',
          imageUrl: imageUrl,
          prompt: expandPrompt,
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        onProcess(data.imageUrl, '智能扩图');
      } else {
        setError(data.error || data.errors?.[0] || '扩图失败');
      }
    } catch (err) {
      setError('扩图失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setActiveTool(null);
      onProcessingChange(false);
    }
  };

  // 内容填充处理
  const handleInpaint = async () => {
    if (!imageUrl) return;

    setActiveTool('inpaint');
    setError(null);
    onProcessingChange(true);

    try {
      // 检查是否有选区
      if (!selection || !selection.mask || selection.mask.length === 0) {
        setError('请先用选区工具（魔棒/套索/矩形/椭圆）选择要填充的区域');
        setActiveTool(null);
        onProcessingChange(false);
        return;
      }

      // 使用裁剪-处理-合成方案
      // 1. 裁剪出包含选区的区域
      // 2. 让 AI 处理这个区域
      // 3. 将结果合成回原图

      const { croppedImageUrl, cropBounds, originalBounds } = await cropSelectionArea(imageUrl, selection);

      // 获取选区边界信息
      const bounds = selection.bounds;
      const boundsInfo = bounds ? 
        `The rectangular area from (${bounds.x}, ${bounds.y}) to (${bounds.x + bounds.width}, ${bounds.y + bounds.height}) ` :
        'The marked area ';

      // 构建 inpaint prompt，强调只处理选区
      const inpaintPrompt = prompt || 
        `This image contains a marked area that needs to be regenerated. ` +
        `Please generate new content only for the marked (blurred/smoothed) area. ` +
        `The new content should seamlessly blend with the surrounding pixels in terms of lighting, colors, textures, patterns, and perspective. ` +
        `IMPORTANT: Everything outside the marked area must remain EXACTLY the same - do not modify any pixels outside this area. ` +
        `Create a natural, seamless fill that looks like the original unedited image.`;

      // 调用 AI 处理裁剪后的图像
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'inpaint_crop',
          imageUrl: croppedImageUrl,
          originalBounds: originalBounds,
          cropBounds: cropBounds,
          prompt: inpaintPrompt,
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        // 将处理后的裁剪图像合成回原图
        const finalImageUrl = await compositeResult(imageUrl, data.imageUrl, originalBounds);
        onProcess(finalImageUrl, '内容填充');
      } else {
        setError(data.error || data.errors?.[0] || '内容填充失败');
      }
    } catch (err) {
      setError('内容填充失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setActiveTool(null);
      onProcessingChange(false);
    }
  };

  // 通过代理获取图片，避免跨域问题
  const fetchImageProxy = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch('/api/fetch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        return data.imageUrl;
      }
      return imageUrl;
    } catch {
      return imageUrl;
    }
  };

  // 裁剪出包含选区的区域
  const cropSelectionArea = async (
    imgUrl: string, 
    sel: SelectionData
  ): Promise<{
    croppedImageUrl: string;
    cropBounds: { x: number; y: number; width: number; height: number };
    originalBounds: { x: number; y: number; width: number; height: number };
  }> => {
    return new Promise((resolve, reject) => {
      // 先通过代理获取图片，避免跨域问题
      fetchImageProxy(imgUrl).then((proxyUrl) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const mask = sel.mask!;
            
            // 计算选区边界
            const bounds = sel.bounds || { x: 0, y: 0, width: img.width, height: img.height };
            
            // 添加一些边距，确保周围上下文被包含
            const margin = Math.max(bounds.width, bounds.height) * 0.3;
            const cropX = Math.max(0, Math.floor(bounds.x - margin));
            const cropY = Math.max(0, Math.floor(bounds.y - margin));
            const cropWidth = Math.min(img.width - cropX, Math.ceil(bounds.width + margin * 2));
            const cropHeight = Math.min(img.height - cropY, Math.ceil(bounds.height + margin * 2));
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            
            // 绘制裁剪区域
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            // 获取图像数据
            const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
            
            // 对选区进行均值模糊
            const radius = 3;
            for (let y = 0; y < cropHeight; y++) {
              for (let x = 0; x < cropWidth; x++) {
                // 检查这个像素是否在原始选区内（相对于完整图像）
                const imgX = cropX + x;
                const imgY = cropY + y;
                
                if (mask[imgY]?.[imgX]) {
                  // 计算周围像素的均值
                  let r = 0, g = 0, b = 0, count = 0;
                  for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                      const nx = imgX + dx;
                      const ny = imgY + dy;
                      if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height && mask[ny]?.[nx]) {
                        const idx = (ny * img.width + nx) * 4;
                        r += imageData.data[(y + dy) * cropWidth * 4 + (x + dx) * 4];
                        g += imageData.data[(y + dy) * cropWidth * 4 + (x + dx) * 4 + 1];
                        b += imageData.data[(y + dy) * cropWidth * 4 + (x + dx) * 4 + 2];
                        count++;
                      }
                    }
                  }
                  if (count > 0) {
                    const idx = (y * cropWidth + x) * 4;
                    imageData.data[idx] = r / count;
                    imageData.data[idx + 1] = g / count;
                    imageData.data[idx + 2] = b / count;
                  }
                }
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            resolve({
              croppedImageUrl: canvas.toDataURL('image/png'),
              cropBounds: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
              originalBounds: bounds
            });
          } catch (err) {
            console.error('裁剪失败:', err);
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('加载图像失败'));
        img.src = proxyUrl;
      }).catch(reject);
    });
  };

  // 将处理后的结果合成回原图
  const compositeResult = async (
    originalUrl: string,
    processedUrl: string,
    originalBounds: { x: number; y: number; width: number; height: number }
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 先通过代理获取图片，避免跨域问题
      Promise.all([
        fetchImageProxy(originalUrl),
        fetchImageProxy(processedUrl)
      ]).then(([proxyOriginalUrl, proxyProcessedUrl]) => {
        const originalImg = new Image();
        const processedImg = new Image();
        
        let originalLoaded = false;
        let processedLoaded = false;
        
        const checkAndProcess = () => {
          if (originalLoaded && processedLoaded) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = originalImg.width;
              canvas.height = originalImg.height;
              const ctx = canvas.getContext('2d')!;
              
              // 绘制原图
              ctx.drawImage(originalImg, 0, 0);
              
              // 计算处理区域在画布上的位置
              const destX = originalBounds.x;
              const destY = originalBounds.y;
              const destWidth = Math.min(originalBounds.width, processedImg.width);
              const destHeight = Math.min(originalBounds.height, processedImg.height);
              
              // 绘制处理后的图像到对应位置
              ctx.drawImage(processedImg, 0, 0, destWidth, destHeight, destX, destY, destWidth, destHeight);
              
              resolve(canvas.toDataURL('image/png'));
            } catch (err) {
              console.error('合成失败:', err);
              reject(err);
            }
          }
        };
        
        originalImg.onload = () => {
          originalLoaded = true;
          checkAndProcess();
        };
        processedImg.onload = () => {
          processedLoaded = true;
          checkAndProcess();
        };
        
        originalImg.onerror = () => reject(new Error('加载原图失败'));
        processedImg.onerror = () => reject(new Error('加载处理结果失败'));
        
        originalImg.crossOrigin = 'anonymous';
        processedImg.crossOrigin = 'anonymous';
        originalImg.src = proxyOriginalUrl;
        processedImg.src = proxyProcessedUrl;
      }).catch(reject);
    });
  };

  // 通用处理函数
  const handleProcess = async (toolId: string) => {
    if (!imageUrl) {
      setError('请先上传图片');
      return;
    }

    // 扩图特殊处理
    if (toolId === 'expand') {
      handleExpand(expandScale);
      return;
    }

    // 内容填充特殊处理
    if (toolId === 'inpaint') {
      handleInpaint();
      return;
    }

    setError(null);
    setActiveTool(toolId);
    onProcessingChange(true);

    try {
      const requestBody: Record<string, unknown> = {
        action: toolId,
        imageUrl,
        prompt: prompt || undefined,
      };

      if (toolId === 'style_transfer' && styleImage) {
        requestBody.styleImageUrl = styleImage;
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        onProcess(data.imageUrl, aiTools.find(t => t.id === toolId)?.name || 'AI处理');
      } else {
        setError(data.error || data.errors?.[0] || '处理失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setActiveTool(null);
      onProcessingChange(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-medium text-white">AI 智能处理</h3>
        
        {/* GPU 状态指示 */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={cn(
            "w-2 h-2 rounded-full",
            gpuStatus === 'checking' && "bg-yellow-400 animate-pulse",
            gpuStatus === 'available' && "bg-green-400",
            gpuStatus === 'unavailable' && "bg-gray-400"
          )} />
          <span className="text-xs text-white/50">
            {gpuStatus === 'checking' && '检测中...'}
            {gpuStatus === 'available' && 'WebGPU'}
            {gpuStatus === 'unavailable' && '标准模式'}
          </span>
        </div>
      </div>

      {/* AI 功能列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <div key={tool.id} className="space-y-2">
              <button
                onClick={() => handleProcess(tool.id)}
                disabled={isProcessing || !imageUrl}
                className={cn(
                  "w-full p-4 rounded-xl border transition-all text-left",
                  "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive && "ring-2 ring-amber-400/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-lg bg-gradient-to-br",
                    tool.color
                  )}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{tool.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{tool.description}</p>
                    {tool.tips && (
                      <p className="text-xs text-white/30 mt-1">{tool.tips}</p>
                    )}
                  </div>
                  {isActive && (
                    <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                  )}
                </div>
              </button>

              {/* 扩图 - 选择扩展倍数 */}
              {tool.id === 'expand' && (
                <div className="pl-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                      <span>扩展倍数</span>
                      <span className="text-white font-medium">{expandScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.2"
                      max="2.0"
                      step="0.1"
                      value={expandScale}
                      onChange={(e) => setExpandScale(parseFloat(e.target.value))}
                      disabled={isProcessing}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>1.2x</span>
                      <span>2.0x</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExpand(expandScale)}
                    disabled={isProcessing || !imageUrl}
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    开始扩图
                  </button>
                </div>
              )}

              {/* 内容填充 - 开始填充按钮 */}
              {tool.id === 'inpaint' && (
                <div className="pl-4">
                  <button
                    onClick={handleInpaint}
                    disabled={isProcessing || !imageUrl}
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selection && selection.mask && selection.mask.length > 0 ? '开始填充' : '选择区域后点击'}
                  </button>
                </div>
              )}

              {/* 风格迁移 - 上传风格图 */}
              {tool.id === 'style_transfer' && (
                <div className="pl-4">
                  <input
                    ref={styleInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleStyleImageUpload}
                  />
                  <button
                    onClick={() => styleInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full p-3 rounded-lg border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {styleImage ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={styleImage}
                          alt="风格图"
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-xs text-white/70">风格参考图已上传</p>
                          <p className="text-xs text-white/40">点击更换</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/50">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs">上传风格参考图</span>
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* 自定义提示词 */}
        <div className="pt-4 border-t border-white/10">
          <label className="text-xs text-white/50 mb-2 block">自定义提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="可选：描述你想要的效果..."
            className="w-full h-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <p className="text-xs text-amber-100 whitespace-pre-line">{error}</p>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Cpu className="h-3 w-3" />
          <span>使用云端 AI 加速处理</span>
          <Zap className="h-3 w-3 text-amber-400 ml-auto" />
        </div>
      </div>
    </div>
  );
}
