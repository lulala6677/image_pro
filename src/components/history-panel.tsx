'use client';

import { useState } from 'react';
import { History, RotateCcw, Trash2, Download, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface HistoryEntry {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  thumbnail: string;
  timestamp: number;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentId?: string;
  onRestore: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({ entries, currentId, onRestore, onClear }: HistoryPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/40 p-6">
        <Clock className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">暂无历史</p>
        <p className="text-xs mt-1">处理图片后将记录历史</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white/80">历史记录</span>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            {entries.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-white/50 hover:text-red-400 hover:bg-red-500/10" 
          onClick={onClear}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200",
                "border border-transparent hover:border-white/10",
                currentId === entry.id 
                  ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-violet-400/30" 
                  : "bg-white/5 hover:bg-white/10"
              )}
              onClick={() => onRestore(entry.id)}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 border border-white/10">
                <img
                  src={entry.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{entry.operation}</p>
                <p className="text-xs text-white/40">
                  #{index + 1} · {formatTime(entry.timestamp)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-white/40 hover:text-violet-400 hover:bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(entry.id);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

// 对比查看器组件
interface CompareViewProps {
  original: string;
  processed: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function CompareView({ original, processed, onClose, onDownload }: CompareViewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, percentage)));
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center">
      <div className="relative w-full max-w-6xl h-[85vh] rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50">
        {/* 头部 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 animate-pulse" />
              <span className="text-white text-sm font-medium">对比视图</span>
            </div>
            <span className="text-white/50 text-xs">
              拖动滑块对比原图与处理后效果
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button 
                size="sm" 
                onClick={onDownload}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
              >
                <Download className="h-4 w-4 mr-1.5" />
                下载
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 对比区域 */}
        <div 
          className="relative w-full h-full cursor-ew-resize"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 处理后的图片 */}
          <img
            src={processed}
            alt="处理后"
            className="absolute inset-0 w-full h-full object-contain p-12"
          />
          
          {/* 原图 */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={original}
              alt="原图"
              className="absolute inset-0 h-full object-contain p-12"
              style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
            />
          </div>

          {/* 滑块 */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-lg shadow-white/20"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center">
              <div className="flex items-center gap-0.5 text-slate-600">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
            原图
          </div>
          <div className="absolute bottom-6 right-6 bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
            处理后
          </div>
        </div>
      </div>
    </div>
  );
}
