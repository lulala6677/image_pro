'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onImageCapture: (dataUrl: string, width: number, height: number) => void;
}

export function ImageSourceDialog({ open, onClose, onImageCapture }: ImageSourceDialogProps) {
  const [mode, setMode] = useState<'select' | 'camera'>('select');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 清理摄像头
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // 启动摄像头
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
          setHasPermission(true);
        };
      }
    } catch (error) {
      console.error('摄像头访问失败:', error);
      setHasPermission(false);
    }
  }, [facingMode]);

  // 切换前后摄像头
  const switchCamera = useCallback(async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  // 拍照
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !isStreaming) return;
    if (videoRef.current.videoWidth === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onImageCapture(dataUrl, video.videoWidth, video.videoHeight);
    
    stopCamera();
    setMode('select');
    onClose();
  }, [isStreaming, onImageCapture, stopCamera, onClose]);

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageCapture(dataUrl, img.width, img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    
    onClose();
  }, [onImageCapture, onClose]);

  // 打开摄像头模式时启动摄像头
  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    return () => {
      if (!open) {
        stopCamera();
      }
    };
  }, [open, mode, startCamera, stopCamera]);

  // 对话框关闭时清理
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('select');
      setHasPermission(null);
    }
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl mx-4 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {mode === 'select' ? (
          /* 选择模式 */
          <div className="p-8">
            <h3 className="text-xl font-semibold text-white text-center mb-6">选择图片来源</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 拍摄按钮 */}
              <button
                onClick={() => setMode('camera')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-gradient-to-br from-orange-400/40 via-amber-300/30 to-orange-500/40 border border-white/20 hover:border-white/40 transition-all group"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-orange-400/60 to-orange-500/60 group-hover:from-orange-400 group-hover:to-orange-500 transition-all">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <span className="text-white font-medium">拍摄照片</span>
              </button>

              {/* 导入按钮 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-gradient-to-br from-cyan-400/40 via-blue-300/30 to-cyan-500/40 border border-white/20 hover:border-white/40 transition-all group"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-cyan-400/60 to-cyan-500/60 group-hover:from-cyan-400 group-hover:to-cyan-500 transition-all">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <span className="text-white font-medium">导入图片</span>
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        ) : (
          /* 摄像头模式 */
          <div className="relative">
            {/* 视频预览 */}
            <div 
              className="relative bg-black"
              style={{ aspectRatio: '4/3' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !isStreaming && "hidden"
                )}
              />
              
              {/* 加载中 / 无权限提示 */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {hasPermission === false ? (
                    <div className="text-center p-6">
                      <Camera className="h-12 w-12 text-white/30 mx-auto mb-4" />
                      <p className="text-white/70">无法访问摄像头</p>
                      <p className="text-white/50 text-sm mt-2">请检查浏览器权限设置</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white/70">正在启动摄像头...</p>
                    </div>
                  )}
                </div>
              )}

              {/* 控制按钮 */}
              {isStreaming && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  {/* 切换摄像头 */}
                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <RefreshCw className="h-5 w-5 text-white" />
                  </button>

                  {/* 拍照按钮 */}
                  <button
                    onClick={capturePhoto}
                    className="p-4 rounded-full bg-white hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <div className="w-8 h-8 rounded-full border-4 border-gray-800" />
                  </button>

                  {/* 取消 */}
                  <button
                    onClick={() => {
                      stopCamera();
                      setMode('select');
                    }}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 隐藏的 canvas 用于拍照 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
