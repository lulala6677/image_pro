'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface PixelInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  grayscale: number;
}

interface PixelInspectorProps {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PixelInspector({
  imageDataUrl,
  imageWidth,
  imageHeight,
  zoom,
  containerRef,
}: PixelInspectorProps) {
  const [hoverPixel, setHoverPixel] = useState<PixelInfo | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [pixelData, setPixelData] = useState<ImageData | null>(null);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [gridPixels, setGridPixels] = useState<PixelInfo[]>([]);

  // 计算像素查看器是否应该显示（缩放 >= 400%）
  const showInspector = zoom >= 400;

  // 加载像素数据并检测是否为灰度图
  useEffect(() => {
    if (!imageDataUrl || !showInspector) {
      setPixelData(null);
      setGridPixels([]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, imageWidth, imageHeight);
      setPixelData(data);

      // 检测是否为灰度图（采样检查）
      let grayscaleCount = 0;
      const sampleSize = Math.min(1000, data.width * data.height);
      const step = Math.max(1, Math.floor((data.width * data.height) / sampleSize));
      let checked = 0;

      for (let i = 0; i < data.data.length && checked < sampleSize; i += 4 * step) {
        const r = data.data[i];
        const g = data.data[i + 1];
        const b = data.data[i + 2];
        if (Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
          grayscaleCount++;
        }
        checked++;
      }

      setIsGrayscale(grayscaleCount / checked > 0.95);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, imageWidth, imageHeight, showInspector]);

  // 计算鼠标位置的像素信息
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showInspector || !pixelData || !containerRef.current) return;

    const container = containerRef.current;
    const imgElement = container.querySelector('img');
    if (!imgElement) return;

    const rect = imgElement.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // 转换为图像坐标
    const x = Math.floor((relX / rect.width) * imageWidth);
    const y = Math.floor((relY / rect.height) * imageHeight);

    // 边界检查
    if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) {
      setHoverPixel(null);
      setCursorPos(null);
      setGridPixels([]);
      return;
    }

    // 获取像素颜色
    const pixelIndex = (y * pixelData.width + x) * 4;
    const r = pixelData.data[pixelIndex];
    const g = pixelData.data[pixelIndex + 1];
    const b = pixelData.data[pixelIndex + 2];
    const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    setHoverPixel({ x, y, r, g, b, grayscale });
    setCursorPos({ x: e.clientX, y: e.clientY });

    // 获取周围像素网格 (5x5)
    const gridSize = 5;
    const half = Math.floor(gridSize / 2);
    const pixels: PixelInfo[] = [];

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;

        if (px >= 0 && px < imageWidth && py >= 0 && py < imageHeight) {
          const idx = (py * pixelData.width + px) * 4;
          const pr = pixelData.data[idx];
          const pg = pixelData.data[idx + 1];
          const pb = pixelData.data[idx + 2];
          const gray = Math.round(0.299 * pr + 0.587 * pg + 0.114 * pb);
          pixels.push({ x: px, y: py, r: pr, g: pg, b: pb, grayscale: gray });
        }
      }
    }

    setGridPixels(pixels);
  }, [showInspector, pixelData, imageWidth, imageHeight, containerRef]);

  const handleMouseLeave = useCallback(() => {
    setHoverPixel(null);
    setCursorPos(null);
    setGridPixels([]);
  }, []);

  // 计算 HEX 值
  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

  if (!showInspector) {
    return null;
  }

  return (
    <>
      {/* 像素网格事件捕获层 */}
      <div
        className="absolute inset-0 z-40"
        style={{ cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* 像素网格高亮 */}
      {hoverPixel && (
        <div
          className="absolute border-2 border-white/80 shadow-lg z-30 pointer-events-none"
          style={{
            left: `${(hoverPixel.x / imageWidth) * 100}%`,
            top: `${(hoverPixel.y / imageHeight) * 100}%`,
            width: `${100 / imageWidth}%`,
            height: `${100 / imageHeight}%`,
            boxShadow: '0 0 0 2px rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* 像素信息悬浮框 - 固定在视口右下角 */}
      {hoverPixel && cursorPos && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            right: '20px',
            bottom: '20px',
            left: 'auto',
            top: 'auto',
          }}
        >
          <div className="bg-black/95 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-3 w-[280px]">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/60 font-mono">像素信息</span>
              <span className="text-[10px] text-white/40 font-mono">
                {zoom}% • {Math.round(zoom / 100)}px
              </span>
            </div>

            {/* 颜色预览和当前像素 */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0 shadow-inner"
                style={{
                  backgroundColor: isGrayscale
                    ? `rgb(${hoverPixel.grayscale}, ${hoverPixel.grayscale}, ${hoverPixel.grayscale})`
                    : `rgb(${hoverPixel.r}, ${hoverPixel.g}, ${hoverPixel.b})`
                }}
              />
              <div>
                <div className="text-[10px] text-white/50 font-mono">当前像素 ({hoverPixel.x}, {hoverPixel.y})</div>
                {!isGrayscale && (
                  <div className="text-[12px] text-white font-bold font-mono">
                    R:{hoverPixel.r} G:{hoverPixel.g} B:{hoverPixel.b}
                  </div>
                )}
                <div className="text-[12px] text-white font-bold font-mono">
                  Gray: {hoverPixel.grayscale}
                </div>
              </div>
            </div>

            {/* HEX 值 */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 mb-2">
              <span className="text-[11px] text-white/60 font-mono">HEX</span>
              <span className="text-[12px] text-white font-bold font-mono">
                #{isGrayscale
                  ? toHex(hoverPixel.grayscale) + toHex(hoverPixel.grayscale) + toHex(hoverPixel.grayscale)
                  : toHex(hoverPixel.r) + toHex(hoverPixel.g) + toHex(hoverPixel.b)}
              </span>
            </div>

            {/* 像素网格 */}
            {gridPixels.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-white/50 font-mono mb-1">周围像素 (5x5)</div>
                <div className="grid grid-cols-5 gap-0.5">
                  {gridPixels.map((pixel, index) => {
                    const isCenter = pixel.x === hoverPixel.x && pixel.y === hoverPixel.y;
                    return (
                      <div
                        key={`${pixel.x}-${pixel.y}`}
                        className={`w-7 h-7 rounded border ${
                          isCenter
                            ? 'border-2 border-yellow-400 shadow-lg'
                            : 'border border-white/10'
                        }`}
                        style={{
                          backgroundColor: isGrayscale
                            ? `rgb(${pixel.grayscale}, ${pixel.grayscale}, ${pixel.grayscale})`
                            : `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`
                        }}
                        title={`(${pixel.x}, ${pixel.y}) Gray: ${pixel.grayscale}`}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <span className={`text-[8px] font-mono font-bold ${
                            pixel.grayscale > 127 ? 'text-black' : 'text-white'
                          }`}>
                            {pixel.grayscale}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 灰度值提示 */}
            {isGrayscale && (
              <div className="mt-2 pt-2 border-t border-white/10 text-center">
                <span className="text-[9px] text-white/40 font-mono">灰度图像</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
