'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Crosshair } from 'lucide-react';

interface PixelInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  hex: string;
}

interface PixelViewerProps {
  imageDataUrl: string | null;
  zoom: number;
}

export function PixelViewer({ imageDataUrl, zoom }: PixelViewerProps) {
  const [pixelInfo, setPixelInfo] = useState<PixelInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 加载图片到 canvas
  useEffect(() => {
    if (!imageDataUrl) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // 获取像素信息
  const getPixelInfo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // 计算鼠标在原始图片上的坐标（考虑缩放）
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // 确保坐标在图片范围内
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
      setPixelInfo(null);
      return;
    }

    // 设置 canvas 尺寸为图片尺寸
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 绘制图片并获取像素
    ctx.drawImage(img, 0, 0);
    const pixelData = ctx.getImageData(x, y, 1, 1).data;

    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

    setPixelInfo({ x, y, r, g, b, hex });
  }, []);

  // 判断是否超过800%缩放
  const isHighZoom = zoom >= 800;

  if (!isHighZoom || !imageDataUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Crosshair className="h-12 w-12 text-white/20 mb-4" />
        <p className="text-white/50 text-sm">缩放至 800% 以上查看像素信息</p>
        <p className="text-white/30 text-xs mt-2">当前缩放: {zoom}%</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 像素信息 */}
      {pixelInfo ? (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-start gap-3">
            {/* 颜色预览 */}
            <div 
              className="w-16 h-16 rounded-lg border border-white/20 shadow-lg flex-shrink-0"
              style={{ backgroundColor: pixelInfo.hex }}
            />
            
            {/* 详细信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs mb-1">坐标</p>
              <p className="text-white font-mono text-sm mb-3">
                X: {pixelInfo.x}, Y: {pixelInfo.y}
              </p>
              
              <p className="text-white/40 text-xs mb-1">RGB 值</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-red-500/20 rounded text-red-400 font-mono text-xs">
                  R: {pixelInfo.r}
                </span>
                <span className="px-2 py-1 bg-green-500/20 rounded text-green-400 font-mono text-xs">
                  G: {pixelInfo.g}
                </span>
                <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-400 font-mono text-xs">
                  B: {pixelInfo.b}
                </span>
              </div>
              
              <p className="text-white/40 text-xs mt-3 mb-1">HEX 值</p>
              <p className="text-white font-mono text-sm bg-white/5 px-2 py-1 rounded inline-block">
                {pixelInfo.hex}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <p className="text-white/50 text-sm">将鼠标移到图片上查看像素</p>
        </div>
      )}

      {/* 提示 */}
      <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <p className="text-amber-400/80 text-xs">
          当前缩放 {zoom}% - 将鼠标移到图片上查看每个像素的详细信息
        </p>
      </div>

      {/* 隐藏的 canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
