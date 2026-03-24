'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Wand2, Lasso, X, RotateCcw, Square, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SelectionData, SelectionToolType, Point, WandToolParams, LassoToolParams } from '@/lib/selection/types';
import { magicWandSelect, lassoSelect, selectAll, clearSelection, invertSelection, getPixelData, createSelectionOverlay } from '@/lib/selection/selection-utils';

interface SelectionToolsProps {
  imageWidth: number;
  imageHeight: number;
  imageData: string;
  selection: SelectionData | null;
  onSelectionChange: (selection: SelectionData | null) => void;
  onSelectionOverlayChange: (overlay: string | null) => void;
  disabled?: boolean;
}

export function SelectionTools({
  imageWidth,
  imageHeight,
  imageData,
  selection,
  onSelectionChange,
  onSelectionOverlayChange,
  disabled = false,
}: SelectionToolsProps) {
  const [activeTool, setActiveTool] = useState<SelectionToolType>('none');
  const [wandParams, setWandParams] = useState<WandToolParams>({
    tolerance: 32,
    contiguous: true,
    invert: false,
  });
  const [lassoParams, setLassoParams] = useState<LassoToolParams>({
    feather: 0,
    invert: false,
  });
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pixelData, setPixelData] = useState<ImageData | null>(null);
  
  // 加载像素数据
  useEffect(() => {
    if (imageData && imageWidth && imageHeight) {
      getPixelData(imageData, imageWidth, imageHeight).then(setPixelData);
    }
  }, [imageData, imageWidth, imageHeight]);
  
  // 更新选区可视化
  useEffect(() => {
    if (selection && imageWidth && imageHeight) {
      const overlay = createSelectionOverlay(selection, imageWidth, imageHeight);
      onSelectionOverlayChange(overlay);
    } else {
      onSelectionOverlayChange(null);
    }
  }, [selection, imageWidth, imageHeight, onSelectionOverlayChange]);
  
  // 处理魔棒点击
  const handleWandClick = useCallback((x: number, y: number) => {
    if (!pixelData || activeTool !== 'wand') return;
    
    const newSelection = magicWandSelect(pixelData, x, y, wandParams);
    onSelectionChange(newSelection);
  }, [pixelData, activeTool, wandParams, onSelectionChange]);
  
  // 处理套索绘制
  const handleLassoStart = useCallback((x: number, y: number) => {
    if (activeTool !== 'lasso') return;
    
    setLassoPoints([{ x, y }]);
    setIsDrawing(true);
  }, [activeTool]);
  
  const handleLassoMove = useCallback((x: number, y: number) => {
    if (!isDrawing || activeTool !== 'lasso') return;
    
    setLassoPoints(prev => [...prev, { x, y }]);
  }, [isDrawing, activeTool]);
  
  const handleLassoEnd = useCallback(() => {
    if (!isDrawing || lassoPoints.length < 3) {
      setLassoPoints([]);
      setIsDrawing(false);
      return;
    }
    
    // 闭合多边形
    const closedPoints = [...lassoPoints, lassoPoints[0]];
    const newSelection = lassoSelect(imageWidth, imageHeight, closedPoints, lassoParams);
    onSelectionChange(newSelection);
    
    setLassoPoints([]);
    setIsDrawing(false);
  }, [isDrawing, lassoPoints, imageWidth, imageHeight, lassoParams, onSelectionChange]);
  
  // 清除选区
  const handleClearSelection = useCallback(() => {
    onSelectionChange(null);
    setActiveTool('none');
    setLassoPoints([]);
    setIsDrawing(false);
  }, [onSelectionChange]);
  
  // 全选
  const handleSelectAll = useCallback(() => {
    const newSelection = selectAll(imageWidth, imageHeight);
    onSelectionChange(newSelection);
  }, [imageWidth, imageHeight, onSelectionChange]);
  
  // 反选
  const handleInvertSelection = useCallback(() => {
    if (selection) {
      const newSelection = invertSelection(selection);
      onSelectionChange(newSelection);
    }
  }, [selection, onSelectionChange]);
  
  return (
    <div className="flex flex-col gap-3 p-3">
      {/* 工具选择 */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'wand' ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${activeTool === 'wand' ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveTool(activeTool === 'wand' ? 'none' : 'wand')}
                disabled={disabled}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/80 border-white/10">
              <p>魔棒工具</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'lasso' ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${activeTool === 'lasso' ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveTool(activeTool === 'lasso' ? 'none' : 'lasso')}
                disabled={disabled}
              >
                <Lasso className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/80 border-white/10">
              <p>套索工具</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="w-px h-6 bg-white/10 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                onClick={handleSelectAll}
                disabled={disabled}
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/80 border-white/10">
              <p>全选</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                onClick={handleInvertSelection}
                disabled={disabled || !selection}
              >
                <Circle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/80 border-white/10">
              <p>反选</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                onClick={handleClearSelection}
                disabled={disabled || !selection}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/80 border-white/10">
              <p>取消选择</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* 魔棒参数 */}
      {activeTool === 'wand' && (
        <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">容差</Label>
              <span className="text-xs text-white/50">{wandParams.tolerance}</span>
            </div>
            <Slider
              value={[wandParams.tolerance]}
              onValueChange={([value]) => setWandParams(prev => ({ ...prev, tolerance: value }))}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/70">连续</Label>
            <Switch
              checked={wandParams.contiguous}
              onCheckedChange={(checked) => setWandParams(prev => ({ ...prev, contiguous: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/70">反选</Label>
            <Switch
              checked={wandParams.invert}
              onCheckedChange={(checked) => setWandParams(prev => ({ ...prev, invert: checked }))}
            />
          </div>
          
          <p className="text-[10px] text-white/40 leading-relaxed">
            点击图像选择颜色相似的区域
          </p>
        </div>
      )}
      
      {/* 套索参数 */}
      {activeTool === 'lasso' && (
        <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">羽化</Label>
              <span className="text-xs text-white/50">{lassoParams.feather}px</span>
            </div>
            <Slider
              value={[lassoParams.feather]}
              onValueChange={([value]) => setLassoParams(prev => ({ ...prev, feather: value }))}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/70">反选</Label>
            <Switch
              checked={lassoParams.invert}
              onCheckedChange={(checked) => setLassoParams(prev => ({ ...prev, invert: checked }))}
            />
          </div>
          
          <p className="text-[10px] text-white/40 leading-relaxed">
            在图像上绘制封闭区域，双击或回到起点完成选择
          </p>
        </div>
      )}
      
      {/* 选区信息 */}
      {selection && selection.bounds.width > 0 && (
        <div className="text-[10px] text-white/40 p-2 rounded bg-white/5 border border-white/10">
          选区: {selection.bounds.width} × {selection.bounds.height} px
        </div>
      )}
      
      {/* 导出工具方法 */}
      <div className="hidden" data-selection-tool={activeTool} data-lasso-points={JSON.stringify(lassoPoints)} data-is-drawing={isDrawing} />
    </div>
  );
}

// 选区画布覆盖层组件
interface SelectionCanvasProps {
  imageWidth: number;
  imageHeight: number;
  selectionOverlay: string | null;
  activeTool: SelectionToolType;
  lassoPoints: Point[];
  isDrawing: boolean;
  onWandClick: (x: number, y: number) => void;
  onLassoStart: (x: number, y: number) => void;
  onLassoMove: (x: number, y: number) => void;
  onLassoEnd: () => void;
  zoom: number;
}

export function SelectionCanvas({
  imageWidth,
  imageHeight,
  selectionOverlay,
  activeTool,
  lassoPoints,
  isDrawing,
  onWandClick,
  onLassoStart,
  onLassoMove,
  onLassoEnd,
  zoom,
}: SelectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<Point | null>(null);
  
  // 绘制选区覆盖层
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制选区蒙版
    if (selectionOverlay) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = selectionOverlay;
    }
    
    // 绘制套索路径
    if (lassoPoints.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
      }
      
      if (!isDrawing) {
        ctx.closePath();
      }
      
      ctx.stroke();
    }
  }, [selectionOverlay, lassoPoints, isDrawing]);
  
  // 处理鼠标事件
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'wand') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (imageWidth / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (imageHeight / rect.height));
    
    onWandClick(x, y);
  }, [activeTool, imageWidth, imageHeight, onWandClick]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'lasso') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (imageWidth / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (imageHeight / rect.height));
    
    lastPointRef.current = { x, y };
    onLassoStart(x, y);
  }, [activeTool, imageWidth, imageHeight, onLassoStart]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'lasso' || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (imageWidth / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (imageHeight / rect.height));
    
    // 只在移动一定距离后添加新点，减少点数
    if (lastPointRef.current) {
      const dx = x - lastPointRef.current.x;
      const dy = y - lastPointRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 3) return;
    }
    
    lastPointRef.current = { x, y };
    onLassoMove(x, y);
  }, [activeTool, isDrawing, imageWidth, imageHeight, onLassoMove]);
  
  const handleMouseUp = useCallback(() => {
    if (activeTool === 'lasso' && isDrawing) {
      onLassoEnd();
    }
  }, [activeTool, isDrawing, onLassoEnd]);
  
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'lasso' && isDrawing) {
      onLassoEnd();
    }
  }, [activeTool, isDrawing, onLassoEnd]);
  
  if (activeTool === 'none') {
    return null;
  }
  
  return (
    <canvas
      ref={canvasRef}
      width={imageWidth}
      height={imageHeight}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      style={{ 
        imageRendering: 'pixelated',
        pointerEvents: 'auto',
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}

// 导出 hooks 供主组件使用
export function useSelectionTools() {
  const [activeTool, setActiveTool] = useState<SelectionToolType>('none');
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [selectionOverlay, setSelectionOverlay] = useState<string | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  return {
    activeTool,
    setActiveTool,
    selection,
    setSelection,
    selectionOverlay,
    setSelectionOverlay,
    lassoPoints,
    setLassoPoints,
    isDrawing,
    setIsDrawing,
  };
}
