'use client';

import { useState, useRef } from 'react';
import { Sparkles, Wand2, Expand, Palette, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AIProcessingPanelProps {
  imageUrl?: string;
  onProcess: (resultUrl: string, operation: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  selection?: { mask?: boolean[][]; bounds?: { x: number; y: number; width: number; height: number } } | null;
}

// AI 工具配置
const aiTools = [
  {
    id: 'denoise',
    name: '智能去噪',
    icon: Wand2,
    color: 'from-violet-500/80 to-purple-500/80',
    colorBorder: 'border-violet-400/50',
    colorShadow: 'shadow-violet-500/20',
  },
  {
    id: 'expand',
    name: '智能扩图',
    icon: Expand,
    color: 'from-blue-500/80 to-cyan-500/80',
    colorBorder: 'border-cyan-400/50',
    colorShadow: 'shadow-cyan-500/20',
  },
  {
    id: 'style_transfer',
    name: '风格迁移',
    icon: Palette,
    color: 'from-pink-500/80 to-rose-500/80',
    colorBorder: 'border-pink-400/50',
    colorShadow: 'shadow-pink-500/20',
  },
];

export function AIProcessingPanel({
  imageUrl,
  onProcess,
  isProcessing,
  onProcessingChange,
}: AIProcessingPanelProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [expandScale, setExpandScale] = useState([1.5]);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  // 风格图上传
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
      const expandPrompt = 
        `Extend and expand this image outward to create a wider view. ` +
        `IMPORTANT: Keep the original content in the center completely unchanged. ` +
        `Only generate new natural content at the edges to seamlessly expand the scene. ` +
        `Match the lighting, colors, atmosphere, textures, and perspective of the original image. ` +
        `The new expanded areas should look like a natural continuation of the original scene. ` +
        `The overall composition should look like one coherent image with a wider field of view.`;

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

  // 通用 AI 处理
  const handleProcess = async (toolId: string) => {
    if (!imageUrl) return;

    setError(null);
    setActiveTool(toolId);
    onProcessingChange(true);

    try {
      const requestBody: Record<string, unknown> = {
        action: toolId,
        imageUrl,
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
        const toolName = aiTools.find(t => t.id === toolId)?.name || 'AI处理';
        onProcess(data.imageUrl, toolName);
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
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col">
        {/* 标题 */}
        <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white/90">AI 智能</h2>
          </div>
        </div>

        {/* 工具列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {aiTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            const isProcessingThis = isActive;

            return (
              <div key={tool.id} className="space-y-3">
                {/* 工具标签 */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-sm bg-gradient-to-br",
                    tool.color
                  )} />
                  <span className="text-xs font-medium text-white/70">{tool.name}</span>
                </div>

                {/* 工具按钮 */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-lg border transition-all",
                          isProcessingThis
                            ? cn("bg-gradient-to-r text-black shadow-lg", tool.color, tool.colorShadow, "border-current")
                            : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20"
                        )}
                        onClick={() => handleProcess(tool.id)}
                        disabled={isProcessing || !imageUrl}
                      >
                        {isProcessingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-xs">
                      <p>{tool.name}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* 扩图 - 比例滑块 */}
                  {tool.id === 'expand' && (
                    <div className="flex-1 flex items-center gap-3">
                      <Slider
                        value={expandScale}
                        min={1.2}
                        max={2.0}
                        step={0.1}
                        onValueChange={(value) => setExpandScale(value)}
                        className="flex-1"
                        disabled={isProcessing}
                      />
                      <span className="text-xs text-cyan-400/80 font-mono w-10 text-right">
                        {expandScale[0].toFixed(1)}x
                      </span>
                    </div>
                  )}

                  {/* 风格迁移 - 上传按钮 */}
                  {tool.id === 'style_transfer' && (
                    <input
                      ref={styleInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStyleImageUpload}
                    />
                  )}
                </div>

                {/* 风格迁移 - 预览 */}
                {tool.id === 'style_transfer' && styleImage && (
                  <div className="relative">
                    <img
                      src={styleImage}
                      alt="风格图"
                      className="w-full h-16 object-cover rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 px-2 text-[10px] bg-black/50 hover:bg-black/70 text-white/60"
                      onClick={() => {
                        setStyleImage(null);
                        styleInputRef.current?.click();
                      }}
                    >
                      更换
                    </Button>
                  </div>
                )}

                {/* 风格迁移 - 上传提示 */}
                {tool.id === 'style_transfer' && !styleImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-white/40 border border-dashed border-white/10 hover:border-white/20 hover:text-white/60"
                    onClick={() => styleInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    上传风格参考图
                  </Button>
                )}
              </div>
            );
          })}

          {/* 错误提示 */}
          {error && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-100">{error}</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
