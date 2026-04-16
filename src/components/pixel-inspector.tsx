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

  // 计算像素查看器是否应该显示（缩放 >= 400%）
  const showInspector = zoom >= 400;

  // 加载像素数据并检测是否为灰度图
  useEffect(() => {
    if (!imageDataUrl || !showInspector) {
      setPixelData(null);
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
        // 如果 R=G=B，则为灰度像素
        if (Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
          grayscaleCount++;
        }
        checked++;
      }

      // 如果超过 95% 的像素是灰度，则认为是灰度图
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
  }, [showInspector, pixelData, imageWidth, imageHeight, containerRef]);

  const handleMouseLeave = useCallback(() => {
    setHoverPixel(null);
    setCursorPos(null);
  }, []);

  // 计算 HEX 值
  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

  if (!showInspector) {
    return null;
  }

  // 计算像素网格大小（每个像素的显示大小）
  const pixelSize = zoom;

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

      {/* 像素信息悬浮框 */}
      {hoverPixel && cursorPos && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: Math.min(cursorPos.x + 20, window.innerWidth - 200),
            top: Math.min(cursorPos.y + 20, window.innerHeight - 140),
          }}
        >
          <div className="bg-black/95 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-3 min-w-[150px]">
            {/* 颜色预览和标题 */}
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
                <div className="text-[10px] text-white/50 font-mono">像素坐标</div>
                <div className="text-[13px] text-white font-bold font-mono">
                  ({hoverPixel.x}, {hoverPixel.y})
                </div>
              </div>
            </div>

            {/* 数值显示 */}
            <div className="space-y-1.5">
              {isGrayscale ? (
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-white/60 font-mono">灰度值</span>
                  <span className="text-[13px] text-white font-bold font-mono">
                    {hoverPixel.grayscale}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 bg-white/5 rounded-lg p-2">
                  <div className="text-center">
                    <div className="text-[9px] text-red-400 font-mono">R</div>
                    <div className="text-[13px] text-white font-bold font-mono">{hoverPixel.r}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-green-400 font-mono">G</div>
                    <div className="text-[13px] text-white font-bold font-mono">{hoverPixel.g}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-blue-400 font-mono">B</div>
                    <div className="text-[13px] text-white font-bold font-mono">{hoverPixel.b}</div>
                  </div>
                </div>
              )}

              {/* HEX 值 */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-[11px] text-white/60 font-mono">HEX</span>
                <span className="text-[12px] text-white font-bold font-mono">
                  #{isGrayscale
                    ? toHex(hoverPixel.grayscale) + toHex(hoverPixel.grayscale) + toHex(hoverPixel.grayscale)
                    : toHex(hoverPixel.r) + toHex(hoverPixel.g) + toHex(hoverPixel.b)}
                </span>
              </div>

              {/* 灰度值（始终显示） */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-[11px] text-white/60 font-mono">灰度值</span>
                <span className="text-[13px] text-white font-bold font-mono">
                  {hoverPixel.grayscale}
                </span>
              </div>
            </div>

            {/* 提示 */}
            <div className="mt-2 pt-2 border-t border-white/10 text-center">
              <span className="text-[9px] text-white/40 font-mono">
                当前缩放: {zoom}% ({Math.round(pixelSize)}px/像素)
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
