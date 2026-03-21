'use client';

import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      <Card className="relative overflow-hidden">
        <div className="aspect-video relative bg-muted/50 flex items-center justify-center p-4">
          <img
            src={currentImage.dataUrl}
            alt={currentImage.name}
            className="max-w-full max-h-full object-contain rounded"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3 border-t">
          <p className="text-sm font-medium truncate">{currentImage.name}</p>
          <p className="text-xs text-muted-foreground">
            {currentImage.width} × {currentImage.height} px
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer",
        "w-[360px] h-[280px] flex-shrink-0",
        isDragging && "border-primary bg-primary/5",
        isLoading && "opacity-50 pointer-events-none"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="mb-2 rounded-full bg-primary/10 p-2.5">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mb-1 text-sm font-semibold">上传图片</h3>
        <p className="mb-1 text-xs text-muted-foreground">
          拖拽图片到此处，或点击选择
        </p>
        <p className="text-xs text-muted-foreground">
          支持 JPG, PNG, GIF, WebP
        </p>
      </div>
      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </Card>
  );
}
