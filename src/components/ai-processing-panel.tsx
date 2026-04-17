'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Expand, Palette, Eraser, Cpu, Zap, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIProcessingPanelProps {
  imageUrl?: string;
  onProcess: (resultUrl: string, operation: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

export function AIProcessingPanel({
  imageUrl,
  onProcess,
  isProcessing,
  onProcessingChange
}: AIProcessingPanelProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpuStatus, setGpuStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [expandScale, setExpandScale] = useState(1.5); // 扩图倍数
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

  // 扩图处理 - 直接让 AI 扩图
  const handleExpand = async (scale: number) => {
    if (!imageUrl) return;

    setActiveTool('expand');
    setError(null);
    onProcessingChange(true);

    try {
      // 直接调用 AI 进行扩图
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

      // 内容填充需要蒙版
      if (toolId === 'inpaint') {
        setError(null);
        setActiveTool(null);
        onProcessingChange(false);
        // 显示需要蒙版的提示
        setError('内容填充功能：\n1. 先使用左侧选区工具（魔棒/套索）选择要填充的区域\n2. 选择区域后，再点击此按钮进行填充');
        return;
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
