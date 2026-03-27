'use client';

import { useState, useRef, useCallback } from 'react';
import { Clock, RotateCcw, Trash2, Zap, X, Download, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface HistoryEntry {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentId?: string;
  onRestore: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({ entries, currentId, onRestore, onClear }: HistoryPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((id: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredId(id);
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredId(null);
    }, 200);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/30 p-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-cyan-500/20 blur-xl" />
          <Clock className="relative h-12 w-12 opacity-30" />
        </div>
        <p className="text-sm font-medium">暂无历史</p>
        <p className="text-xs mt-1 text-white/20">操作后将自动记录</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-white/70">历史记录</span>
          <span className="text-xs text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            {entries.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10"
          onClick={onClear}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          清空
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
        {[...entries].reverse().map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              "relative group cursor-pointer",
              "rounded-xl overflow-hidden",
              "bg-white/5 hover:bg-white/10",
              "border border-white/10 hover:border-orange-400/50",
              currentId === entry.id && "border-orange-400/70 bg-orange-500/10",
              "transition-all duration-200"
            )}
            onMouseEnter={() => handleMouseEnter(entry.id)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onRestore(entry.id)}
          >
            <div className="aspect-video relative overflow-hidden">
              {entry.dataUrl && (
                <img
                  src={entry.dataUrl}
                  alt={entry.operation}
                  className={cn(
                    "w-full h-full object-cover",
                    "transition-transform duration-300",
                    hoveredId === entry.id && "scale-105"
                  )}
                  onError={(e) => {
                    // 防止图片加载失败时触发沙箱环境的默认错误行为
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {/* 悬浮时的渐变覆盖层 - 虹彩风格 */}
              <div className={cn(
                "absolute inset-0",
                "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )} />
              
              {/* 操作标签 */}
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium",
                  "bg-gradient-to-r from-orange-500/80 to-cyan-500/80",
                  "text-white backdrop-blur-sm"
                )}>
                  {entry.operation}
                </span>
              </div>
              
              {/* 悬浮时显示恢复按钮 */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(entry.id);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="text-xs">恢复</span>
                </Button>
              </div>
            </div>
            
            <div className="p-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/50 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-orange-400" />
                  {entry.operation}
                </span>
                <span className="text-white/30 font-mono">
                  {entry.width}×{entry.height}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-white/20 font-mono">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 对比视图组件
interface CompareViewProps {
  original: string;
  processed: string;
  onClose: () => void;
  onDownload: () => void;
}

export function CompareView({ original, processed, onClose, onDownload }: CompareViewProps) {
  // 初始化滑块位置在 50%，并确保值始终在安全范围内
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({ original: false, processed: false });
  const [imageError, setImageError] = useState({ original: false, processed: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    // 限制滑块位置在 5% - 95% 之间，避免边缘计算问题
    const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    // 限制滑块位置在 5% - 95% 之间，避免边缘计算问题
    const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleImageLoad = useCallback((type: 'original' | 'processed') => {
    setImageLoaded(prev => ({ ...prev, [type]: true }));
    setImageError(prev => ({ ...prev, [type]: false }));
  }, []);

  const handleImageError = useCallback((type: 'original' | 'processed') => {
    console.error(`Failed to load ${type} image`);
    setImageError(prev => ({ ...prev, [type]: true }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
      <div className="relative max-w-5xl w-full">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white/90">原图 vs 处理后</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onDownload}
              className="bg-gradient-to-r from-orange-500 via-yellow-500 to-cyan-500 hover:from-orange-400 hover:via-yellow-400 hover:to-cyan-400 text-black font-medium"
            >
              <Download className="h-4 w-4 mr-1.5" />
              下载
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 对比滑块 */}
        <div 
          ref={containerRef}
          className="relative aspect-video rounded-2xl overflow-hidden cursor-col-resize border border-white/20 shadow-2xl bg-black"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
        >
          {/* 加载状态 */}
          {(!imageLoaded.original || !imageLoaded.processed) && !imageError.original && !imageError.processed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="flex items-center gap-2 text-white/50">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                <span className="text-sm">加载图片中...</span>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {(imageError.original || imageError.processed) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center text-white/70">
                <p className="text-sm">图片加载失败</p>
                <p className="text-xs text-white/40 mt-1">请尝试重新处理图片</p>
              </div>
            </div>
          )}

          {/* 处理后的图片 */}
          <img
            src={processed}
            alt="Processed"
            className="absolute inset-0 w-full h-full object-contain"
            onLoad={() => handleImageLoad('processed')}
            onError={() => handleImageError('processed')}
          />

          {/* 原图 - 使用 clip-path 裁剪 */}
          <div 
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={original}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain"
              onLoad={() => handleImageLoad('original')}
              onError={() => handleImageError('original')}
            />
          </div>

          {/* 滑块 */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white/80 shadow-lg cursor-col-resize"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/80 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* 标签 */}
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-500/80 text-white text-xs font-medium backdrop-blur-sm">
            原图
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/80 to-purple-500/80 text-white text-xs font-medium backdrop-blur-sm">
            处理后
          </div>
        </div>

        {/* 提示 */}
        <p className="text-center text-white/30 text-xs mt-4">
          拖动滑块对比原图与处理后的效果
        </p>
      </div>
    </div>
  );
}
