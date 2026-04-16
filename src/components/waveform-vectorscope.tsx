'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

interface WaveformVectorscopeProps {
  imageDataUrl: string | null;
}

export function WaveformVectorscope({ imageDataUrl }: WaveformVectorscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'waveform' | 'vectorscope'>('waveform');
  const [imageLoaded, setImageLoaded] = useState(false);

  // 加载图片
  useEffect(() => {
    if (!imageDataUrl) {
      imageRef.current = null;
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // 绘制波形图和矢量图
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // 设置 canvas 尺寸
    const maxWidth = 280;
    const maxHeight = 200;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    // 绘制图片
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (mode === 'waveform') {
      drawWaveform(ctx, data, canvas.width, canvas.height);
    } else {
      drawVectorscope(ctx, data, canvas.width, canvas.height);
    }
  }, [imageDataUrl, mode, imageLoaded]);

  // 绘制波形图
  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ) => {
    // 清空画布
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // 水平网格线（亮度级别）
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // 垂直网格线
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 计算每列的亮度
    const columnData: number[][] = Array.from({ length: width }, () => []);
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 计算亮度 (ITU-R BT.709)
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        columnData[x].push(luminance);
      }
    }

    // 绘制波形
    for (let x = 0; x < width; x++) {
      const values = columnData[x];
      if (values.length === 0) continue;

      for (const value of values) {
        const y = height - (value / 255) * height;
        
        // 根据亮度设置颜色
        const intensity = value / 255;
        if (intensity > 0.9) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        } else if (intensity > 0.7) {
          ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
        }
        
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 添加刻度标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px monospace';
    ctx.fillText('100%', 3, 12);
    ctx.fillText('0%', 3, height - 3);
    ctx.fillText('0', 3, height / 2 + 3);
    ctx.fillText(`${width}`, width - 25, height - 3);
  };

  // 绘制矢量图
  const drawVectorscope = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ) => {
    // 清空画布
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.9;

    // 绘制圆形参考线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // 外圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 内圆（75%饱和度参考）
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // 十字线
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // 色相标记点
    const hues = ['R', 'Yl', 'G', 'Cy', 'B', 'Mg'];
    const angles = [0, 60, 120, 180, 240, 300];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '8px monospace';
    
    angles.forEach((angle, i) => {
      const rad = (angle - 90) * Math.PI / 180;
      const x = centerX + Math.cos(rad) * (radius + 12);
      const y = centerY + Math.sin(rad) * (radius + 12);
      ctx.fillText(hues[i], x - 3, y + 3);
    });

    // 绘制色点
    for (let i = 0; i < data.length; i += 16) { // 每4个像素取一次样
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // 转换到 YCbCr 空间
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // 转换到向量图坐标
      const saturation = Math.sqrt(Math.pow(cb - 128, 2) + Math.pow(cr - 128, 2)) / 128;
      if (saturation < 0.05 || y < 0.1) continue; // 跳过饱和度太低或太暗的像素

      const angle = Math.atan2(cb - 128, cr - 128);
      const x = centerX + Math.cos(angle) * saturation * radius;
      const yPos = centerY + Math.sin(angle) * saturation * radius;

      // 根据色相设置颜色
      const hue = (angle * 180 / Math.PI + 90 + 360) % 360;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.6)`;
      ctx.fillRect(x, yPos, 1.5, 1.5);
    }
  };

  if (!imageDataUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Activity className="h-12 w-12 text-white/20 mb-4" />
        <p className="text-white/50 text-sm">加载图片后查看波形图和矢量图</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 模式切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('waveform')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === 'waveform'
              ? 'bg-gradient-to-r from-orange-500/40 to-yellow-500/40 text-white border border-orange-400/50'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
          }`}
        >
          波形图
        </button>
        <button
          onClick={() => setMode('vectorscope')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === 'vectorscope'
              ? 'bg-gradient-to-r from-orange-500/40 to-yellow-500/40 text-white border border-orange-400/50'
              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
          }`}
        >
          矢量图
        </button>
      </div>

      {/* 图表容器 */}
      <div className="flex-1 bg-black/50 rounded-xl border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* 图例 */}
      <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
        {mode === 'waveform' ? (
          <div className="text-xs text-white/60">
            <p className="font-medium text-white/80 mb-1">波形图 Waveform</p>
            <p>显示亮度和色彩在图像上的垂直分布</p>
            <p className="mt-1 text-white/40">水平方向：图像从左到右 | 垂直方向：黑(0%) → 白(100%)</p>
          </div>
        ) : (
          <div className="text-xs text-white/60">
            <p className="font-medium text-white/80 mb-1">矢量图 Vectorscope</p>
            <p>显示图像色彩在色相-饱和度空间的分布</p>
            <div className="mt-2 flex flex-wrap gap-2 text-white/40">
              <span>R 红</span>
              <span>Yl 黄</span>
              <span>G 绿</span>
              <span>Cy 青</span>
              <span>B 蓝</span>
              <span>Mg 品</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
