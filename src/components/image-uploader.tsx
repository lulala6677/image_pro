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
          <img
            src={currentImage.dataUrl}
            alt={currentImage.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white border border-white/20 backdrop-blur-sm"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3 border-t border-white/10 bg-white/5">
          <p className="text-sm font-medium truncate text-white/80">{currentImage.name}</p>
          <p className="text-xs text-white/50">
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
        "w-[400px] h-[320px] flex-shrink-0",
        "rounded-2xl overflow-hidden",
        "transition-all duration-300",
        isDragging && "scale-[1.02]"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      {/* 背景渐变 */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20",
        "backdrop-blur-xl border-2 border-dashed transition-all duration-300",
        isDragging 
          ? "border-violet-400/80 bg-violet-500/10" 
          : "border-white/20 hover:border-violet-400/50 hover:bg-white/5",
        isLoading && "opacity-50 pointer-events-none"
      )} />
      
      {/* 动态光效 */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse delay-100" />
      </div>
      
      {/* 内容 */}
      <div className="relative flex flex-col items-center justify-center h-full text-center px-8">
        <div className="relative mb-4">
          {/* 外圈动画 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-50 blur-xl animate-pulse" />
          {/* 图标容器 */}
          <div className={cn(
            "relative rounded-full p-4 transition-all duration-300",
            "bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40",
            "border border-white/20",
            "group-hover:scale-110 group-hover:border-violet-400/50",
            isDragging && "scale-110 border-violet-400"
          )}>
            <Upload className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h3 className="mb-2 text-lg font-semibold text-white">
          上传图片
        </h3>
        <p className="mb-4 text-sm text-white/60 max-w-[280px]">
          拖拽图片到此处，或点击选择文件
        </p>
        
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Sparkles className="h-3 w-3" />
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
