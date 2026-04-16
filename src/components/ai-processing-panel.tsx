'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Expand, Palette, Eraser, Cpu, Zap, Loader2, Upload, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIProcessingPanelProps {
  imageUrl?: string;
  onProcess: (resultUrl: string, operation: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

type ExpandDirection = 'all' | 'left' | 'right' | 'top' | 'bottom';

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
  const [expandDirection, setExpandDirection] = useState<ExpandDirection>('all');
  const [expandAmount, setExpandAmount] = useState(300);
  const [showExpandOptions, setShowExpandOptions] = useState(false);
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

  const handleStyleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setStyleImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExpand = async () => {
    if (!imageUrl) {
      setError('请先上传图片');
      return;
    }

    setError(null);
    setActiveTool('expand');
    onProcessingChange(true);

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'expand-direction',
          imageUrl,
          prompt: prompt || undefined,
          direction: expandDirection,
          amount: expandAmount
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        onProcess(data.imageUrl, `${getDirectionName(expandDirection)}扩图`);
      } else {
        setError(data.error || data.errors?.[0] || '扩图失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '扩图失败');
    } finally {
      setActiveTool(null);
      onProcessingChange(false);
    }
  };

  const getDirectionName = (dir: ExpandDirection): string => {
    const names: Record<ExpandDirection, string> = {
      all: '全方位',
      left: '左侧',
      right: '右侧',
      top: '顶部',
      bottom: '底部'
    };
    return names[dir];
  };

  const expandDirections: { id: ExpandDirection; icon: React.ReactNode; name: string }[] = [
    { id: 'all', icon: <ChevronsUpDown className="h-4 w-4" />, name: '全方位' },
    { id: 'left', icon: <ArrowLeft className="h-4 w-4" />, name: '左侧' },
    { id: 'right', icon: <ArrowRight className="h-4 w-4" />, name: '右侧' },
    { id: 'top', icon: <ArrowUp className="h-4 w-4" />, name: '顶部' },
    { id: 'bottom', icon: <ArrowDown className="h-4 w-4" />, name: '底部' },
  ];

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

      // 内容填充需要蒙版
      if (toolId === 'inpaint') {
        setError(null);
        setActiveTool(null);
        onProcessingChange(false);
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
        const toolNames: Record<string, string> = {
          denoise: '智能去噪',
          style_transfer: '风格迁移',
          enhance: '图像增强'
        };
        onProcess(data.imageUrl, toolNames[toolId] || 'AI处理');
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
        {/* 智能去噪 */}
        <div className="space-y-2">
          <button
            onClick={() => handleProcess('denoise')}
            disabled={isProcessing || !imageUrl}
            className={cn(
              "w-full p-4 rounded-xl border transition-all text-left",
              "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeTool === 'denoise' && "ring-2 ring-amber-400/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">智能去噪</p>
                <p className="text-xs text-white/50 mt-0.5">AI 一键去除图像噪点，增强清晰度</p>
                <p className="text-xs text-white/30 mt-1">保持原图内容不变，仅去除噪点</p>
              </div>
              {activeTool === 'denoise' && (
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              )}
            </div>
          </button>
        </div>

        {/* 智能扩图 */}
        <div className="space-y-2">
          <button
            onClick={() => setShowExpandOptions(!showExpandOptions)}
            disabled={isProcessing || !imageUrl}
            className={cn(
              "w-full p-4 rounded-xl border transition-all text-left",
              "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeTool === 'expand' && "ring-2 ring-amber-400/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                <Expand className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">智能扩图</p>
                <p className="text-xs text-white/50 mt-0.5">扩展图像边界，自然延展画面</p>
                <p className="text-xs text-white/30 mt-1">
                  当前：{getDirectionName(expandDirection)} + {expandAmount}px
                </p>
              </div>
              {activeTool === 'expand' ? (
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 text-white/40" />
              )}
            </div>
          </button>

          {/* 扩图选项 */}
          {showExpandOptions && (
            <div className="pl-4 space-y-3">
              {/* 方向选择 */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">扩展方向</label>
                <div className="grid grid-cols-5 gap-1">
                  {expandDirections.map((dir) => (
                    <button
                      key={dir.id}
                      onClick={() => setExpandDirection(dir.id)}
                      className={cn(
                        "p-2 rounded-lg border transition-all flex flex-col items-center gap-1",
                        expandDirection === dir.id
                          ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {dir.icon}
                      <span className="text-[10px]">{dir.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 扩展大小 */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">
                  扩展大小：{expandAmount}px
                </label>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={expandAmount}
                  onChange={(e) => setExpandAmount(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>100px</span>
                  <span>600px</span>
                </div>
              </div>

              {/* 执行扩图按钮 */}
              <button
                onClick={handleExpand}
                disabled={isProcessing}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                执行扩图
              </button>
            </div>
          )}
        </div>

        {/* 风格迁移 */}
        <div className="space-y-2">
          <button
            onClick={() => handleProcess('style_transfer')}
            disabled={isProcessing || !imageUrl}
            className={cn(
              "w-full p-4 rounded-xl border transition-all text-left",
              "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeTool === 'style_transfer' && "ring-2 ring-amber-400/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">风格迁移</p>
                <p className="text-xs text-white/50 mt-0.5">上传艺术图，将风格应用到当前图片</p>
                <p className="text-xs text-white/30 mt-1">保持原图内容，只改变艺术风格</p>
              </div>
              {activeTool === 'style_transfer' && (
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              )}
            </div>
          </button>

          {/* 上传风格图 */}
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
        </div>

        {/* 内容填充 */}
        <div className="space-y-2">
          <button
            onClick={() => handleProcess('inpaint')}
            disabled={isProcessing || !imageUrl}
            className={cn(
              "w-full p-4 rounded-xl border transition-all text-left",
              "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeTool === 'inpaint' && "ring-2 ring-amber-400/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <Eraser className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">内容填充</p>
                <p className="text-xs text-white/50 mt-0.5">智能去除不需要的内容并自然填充</p>
                <p className="text-xs text-white/30 mt-1">需先使用选区工具选择要填充的区域</p>
              </div>
              {activeTool === 'inpaint' && (
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              )}
            </div>
          </button>
        </div>

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
