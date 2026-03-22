'use client';

import { useEffect, useRef } from 'react';

interface Bubble {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
}

export function BubblesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let bubbles: Bubble[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createBubble = (): Bubble => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 60 + 20,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.15 + 0.05,
      hue: Math.random() * 60 + 180, // 蓝紫色调
    });

    const initBubbles = () => {
      bubbles = [];
      const count = Math.floor((canvas.width * canvas.height) / 50000);
      for (let i = 0; i < Math.min(count, 20); i++) {
        bubbles.push(createBubble());
      }
    };

    const drawBubble = (bubble: Bubble) => {
      const gradient = ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.size
      );
      
      gradient.addColorStop(0, `hsla(${bubble.hue}, 80%, 60%, ${bubble.opacity})`);
      gradient.addColorStop(0.5, `hsla(${bubble.hue}, 70%, 50%, ${bubble.opacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${bubble.hue}, 60%, 40%, 0)`);

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 高光
      const highlightGradient = ctx.createRadialGradient(
        bubble.x - bubble.size * 0.3,
        bubble.y - bubble.size * 0.3,
        0,
        bubble.x - bubble.size * 0.3,
        bubble.y - bubble.size * 0.3,
        bubble.size * 0.5
      );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity * 0.8})`);
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();
    };

    const updateBubble = (bubble: Bubble) => {
      bubble.x += bubble.speedX;
      bubble.y += bubble.speedY;

      // 边界检测
      if (bubble.x < -bubble.size) bubble.x = canvas.width + bubble.size;
      if (bubble.x > canvas.width + bubble.size) bubble.x = -bubble.size;
      if (bubble.y < -bubble.size) bubble.y = canvas.height + bubble.size;
      if (bubble.y > canvas.height + bubble.size) bubble.y = -bubble.size;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bubbles.forEach(bubble => {
        updateBubble(bubble);
        drawBubble(bubble);
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    initBubbles();
    animate();

    window.addEventListener('resize', () => {
      resize();
      initBubbles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
