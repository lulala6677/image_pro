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
      color: 'from-violet-400 to-purple-500'
    },
    {
      id: 'expand',
      name: '智能扩图',
      icon: Expand,
      description: '扩展图像边界，自然延展画面',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      id: 'style_transfer',
      name: '风格迁移',
      icon: Palette,
      description: '上传艺术图，将风格应用到当前图片',
      color: 'from-pink-400 to-rose-500'
    },
    {
      id: 'inpaint',
      name: '内容填充',
      icon: Eraser,
      description: '智能去除不需要的内容并自然填充',
      color: 'from-amber-400 to-orange-500'
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

  const handleProcess = async (toolId: string) => {
    if (!imageUrl) {
      setError('请先上传图片');
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
                  </div>
                  {isActive && (
                    <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                  )}
                </div>
              </button>

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
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-xs text-red-200">{error}</p>
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
