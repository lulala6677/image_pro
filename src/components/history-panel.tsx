'use client';

import { useState } from 'react';
import { History, RotateCcw, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (entries.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            历史记录
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          处理图片后将记录历史
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="px-3 py-2 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="text-sm font-semibold">历史记录</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                currentId === entry.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
              )}
              onClick={() => onRestore(entry.id)}
            >
              <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={entry.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{entry.operation}</p>
                <p className="text-xs text-muted-foreground">
                  #{index + 1} · {formatTime(entry.timestamp)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(entry.id);
                }}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-5xl h-[80vh] bg-background rounded-lg overflow-hidden">
        {/* 头部 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
          <div className="flex items-center gap-4">
            <span className="text-white text-sm font-medium">对比视图</span>
            <span className="text-white/70 text-xs">
              拖动滑块对比原图与处理后效果
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="secondary" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              关闭
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
            className="absolute inset-0 w-full h-full object-contain"
          />
          
          {/* 原图 */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={original}
              alt="原图"
              className="absolute inset-0 h-full object-contain"
              style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
            />
          </div>

          {/* 滑块 */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
            原图
          </div>
          <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
            处理后
          </div>
        </div>
      </div>
    </div>
  );
}
