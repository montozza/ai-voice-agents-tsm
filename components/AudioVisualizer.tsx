import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 1
  color: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, volume, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Map Tailwind colors to hex for canvas
  const getColorHex = (twColor: string) => {
    if (twColor.includes('blue')) return '#2563eb';
    if (twColor.includes('amber')) return '#b45309';
    return '#4b5563'; // gray
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 5;
    const barWidth = 12;
    const spacing = 6;
    const startX = (canvas.width - (bars * barWidth + (bars - 1) * spacing)) / 2;
    const centerY = canvas.height / 2;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const baseHeight = isActive ? 10 : 4;
      const dynamicHeight = isActive ? volume * 50 : 0;
      
      ctx.fillStyle = isActive ? getColorHex(color) : '#cbd5e1';

      for (let i = 0; i < bars; i++) {
        // Create a wave effect
        const offset = Math.sin(Date.now() / 200 + i) * (isActive ? 10 : 0);
        const h = Math.max(4, baseHeight + dynamicHeight + offset);
        
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(startX + i * (barWidth + spacing), centerY - h / 2, barWidth, h, 6);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, volume, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={80} 
      className="block mx-auto"
    />
  );
};

export default AudioVisualizer;
