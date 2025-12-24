
import React, { useRef, useEffect, useState } from 'react';

interface WhiteboardProps {
  socket: any;
  currentRoom: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ socket, currentRoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar tamanho do canvas
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Escutar desenhos remotos
    socket.on('draw', (data: any) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.beginPath();
      ctx.moveTo(data.lastX, data.lastY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    });

    socket.on('clear-board', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [socket, color, brushSize]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const lastPos = useRef({ x: 0, y: 0 });

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getPos(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Enviar para o outro usuário
    socket.emit('draw', {
      x: pos.x,
      y: pos.y,
      lastX: lastPos.current.x,
      lastY: lastPos.current.y,
      color: color,
      size: brushSize
    });

    lastPos.current = pos;
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit('clear-board');
    }
  };

  return (
    <div className="relative w-full h-full bg-[#1e1e1e] cursor-crosshair overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="block"
      />
      
      {/* Toolbar da Lousa */}
      <div className="absolute top-4 left-4 flex gap-3 bg-black/50 p-2 rounded-lg backdrop-blur-md border border-white/10">
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 bg-transparent border-none cursor-pointer"
        />
        <select 
          value={brushSize} 
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="bg-slate-800 text-white text-xs px-2 rounded border-none outline-none"
        >
          <option value="2">Fino</option>
          <option value="5">Médio</option>
          <option value="10">Grosso</option>
        </select>
        <button 
          onClick={clearBoard}
          className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1 rounded text-xs font-bold transition-all"
        >
          Limpar
        </button>
      </div>
    </div>
  );
};
