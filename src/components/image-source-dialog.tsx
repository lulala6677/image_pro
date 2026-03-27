'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
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
    setHasPermission(null);
    setErrorMessage(null);
  }, []);

  // 启动摄像头
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setHasPermission(null);
    
    // 检查是否支持摄像头
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('您的浏览器不支持摄像头功能，请使用现代浏览器（如 Chrome、Firefox、Safari）');
      return;
    }

    // 检查是否是 HTTPS 或 localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setHasPermission(false);
      setErrorMessage('摄像头功能需要 HTTPS 安全连接。请确保网站使用 HTTPS 协议访问。');
      return;
    }

    try {
      // 先尝试获取摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
            setHasPermission(true);
          }).catch(err => {
            console.error('视频播放失败:', err);
            setHasPermission(false);
            setErrorMessage('视频播放失败，请重试');
          });
        };
        videoRef.current.onerror = () => {
          setHasPermission(false);
          setErrorMessage('视频加载失败');
        };
      }
    } catch (error: unknown) {
      console.error('摄像头访问失败:', error);
      setHasPermission(false);
      
      // 根据错误类型提供具体提示
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setErrorMessage('摄像头权限被拒绝。请在浏览器地址栏左侧点击图标，允许摄像头访问权限后刷新页面重试。');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setErrorMessage('未检测到摄像头设备。请确保您的电脑已连接摄像头。');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setErrorMessage('摄像头被其他应用程序占用。请关闭其他使用摄像头的程序后重试。');
        } else if (error.name === 'OverconstrainedError') {
          setErrorMessage('摄像头不支持请求的分辨率。正在尝试较低分辨率...');
          // 尝试使用默认设置
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play();
                setIsStreaming(true);
                setHasPermission(true);
              };
            }
          } catch {
            setErrorMessage('无法启动摄像头');
          }
        } else if (error.name === 'NotSupportedError') {
          setErrorMessage('浏览器不支持摄像头功能');
        } else {
          setErrorMessage(`摄像头访问失败: ${error.message}`);
        }
      } else {
        setErrorMessage('摄像头访问失败，请检查设备连接');
      }
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

    // 如果是前置摄像头，水平翻转
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onImageCapture(dataUrl, video.videoWidth, video.videoHeight);
    
    stopCamera();
    setMode('select');
    onClose();
  }, [isStreaming, facingMode, onImageCapture, stopCamera, onClose]);

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

  // 监听 facingMode 变化，重新启动摄像头
  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
  }, [open, mode, facingMode, startCamera]);

  // 对话框关闭时清理
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('select');
    }
  }, [open, stopCamera]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl mx-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
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
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              
              {/* 加载中 / 无权限提示 */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {hasPermission === false ? (
                    <div className="text-center p-6 max-w-md">
                      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                      <p className="text-white/90 font-medium mb-2">无法访问摄像头</p>
                      <p className="text-white/60 text-sm leading-relaxed">{errorMessage || '请检查浏览器权限设置'}</p>
                      <button
                        onClick={startCamera}
                        className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
                      >
                        重试
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white/70">正在启动摄像头...</p>
                      <p className="text-white/40 text-xs mt-2">请允许浏览器访问摄像头</p>
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
                    title="切换摄像头"
                  >
                    <RefreshCw className="h-5 w-5 text-white" />
                  </button>

                  {/* 拍照按钮 */}
                  <button
                    onClick={capturePhoto}
                    className="p-4 rounded-full bg-white hover:bg-white/90 transition-colors shadow-lg"
                    title="拍照"
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
                    title="取消"
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
