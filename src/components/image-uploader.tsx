'use client';

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ImageFile {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  file?: File;
}

interface ImageUploaderProps {
  onImageLoad: (image: ImageFile) => void;
  currentImage?: ImageFile | null;
  onClear?: () => void;
}

export function ImageUploader({ onImageLoad, currentImage, onClear }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadImage = useCallback((file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageLoad({
          id: `img-${Date.now()}`,
          name: file.name,
          dataUrl: e.target?.result as string,
          width: img.width,
          height: img.height,
          file
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        setIsLoading(false);
        alert('无法加载图片');
      };
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      setIsLoading(false);
      alert('无法读取文件');
    };
    
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    
    if (imageFile) {
      loadImage(imageFile);
    }
  }, [loadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  }, [loadImage]);

  if (currentImage) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="aspect-video relative flex items-center justify-center p-4">
          {currentImage?.dataUrl && (
            <img
              src={currentImage.dataUrl}
              alt={currentImage.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                // 防止图片加载失败时触发沙箱环境的默认错误行为
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {/* 操作按钮 */}
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/10 hover:bg-red-500/80 text-white/70 hover:text-white border border-white/20 backdrop-blur-sm"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-3 border-t border-white/10 bg-white/5">
          <p className="text-sm font-medium truncate text-white/70">{currentImage.name}</p>
          <p className="text-xs text-white/40">
            {currentImage.width} × {currentImage.height} px
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group cursor-pointer",
        "w-full max-w-[400px]",
        "rounded-2xl overflow-hidden",
        "transition-all duration-300",
        isDragging && "scale-[1.02]"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      {/* 背景 */}
      <div className={cn(
        "absolute inset-0",
        "backdrop-blur-xl border-2 border-dashed transition-all duration-300",
        isDragging 
          ? "border-orange-400/80 bg-orange-500/10" 
          : "border-white/20 hover:border-orange-400/50 hover:bg-white/5",
        isLoading && "opacity-50 pointer-events-none"
      )} />
      
      {/* 动态光效 - 虹彩渐变 */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-100" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400/15 rounded-full blur-2xl animate-pulse delay-200" />
      </div>
      
      {/* 内容 - 自适应高度 */}
      <div className="relative flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="relative mb-4">
          {/* 外圈动画 - 虹彩渐变 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500 opacity-60 blur-xl animate-pulse" />
          {/* 图标容器 */}
          <div className={cn(
            "relative rounded-full p-4 transition-all duration-300",
            "bg-gradient-to-br from-orange-500/30 via-yellow-400/20 to-cyan-500/30",
            "border border-white/20",
            "group-hover:scale-110 group-hover:border-orange-400/50",
            isDragging && "scale-110 border-orange-400"
          )}>
            <Upload className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h3 className="mb-2 text-lg font-semibold text-white/90">
          上传图片
        </h3>
        <p className="mb-4 text-sm text-white/50">
          拖拽图片到此处，或点击选择文件
        </p>
        
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Sparkles className="h-3 w-3 text-orange-400" />
          <span>支持 JPG, PNG, GIF, WebP</span>
        </div>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
