
import React, { useRef, useEffect, useState } from 'react';

interface WhiteboardProps {
  socket: any;
  currentRoom: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ socket, currentRoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); // Inicializa com preto para fundo branco
  const [brushSize, setBrushSize] = useState(2);
  const lastPos = useRef({ x: 0, y: 0 });

  const colors = [
    '#000000', // Preto
    '#e11d48', // Vermelho (rose-600)
    '#2563eb', // Azul (blue-600)
    '#16a34a', // Verde (green-600)
    '#d97706', // Laranja (amber-600)
    '#7c3aed', // Roxo (violet-600)
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Salvar o conteúdo atual antes de redimensionar
      const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      
      // Restaurar configurações do contexto que são perdidas no resize
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Tentar restaurar o conteúdo (isso é limitado no resize, mas ajuda)
      ctx.putImageData(tempImage, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ESCUTAR DESENHOS REMOTOS
    const handleRemoteDraw = (data: any) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.beginPath();
      ctx.moveTo(data.lastX, data.lastY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    };

    const handleClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('draw', handleRemoteDraw);
    socket.on('clear-board', handleClear);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      socket.off('draw', handleRemoteDraw);
      socket.off('clear-board', handleClear);
    };
  }, [socket]); // Removi color e brushSize daqui para não resetar o canvas ao trocar de cor

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Suporte para Mouse e Touch (Celular)
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Impedir scroll no celular ao desenhar
    if (e.type === 'touchstart') {
        // e.preventDefault(); // Pode causar problemas em alguns navegadores, melhor usar touch-action: none no CSS
    }
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getPos(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

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
    <div className="relative w-full h-full bg-white cursor-crosshair overflow-hidden" style={{ touchAction: 'none' }}>
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
      <div className="absolute top-4 left-4 flex flex-col sm:flex-row gap-4 bg-slate-100/90 p-3 rounded-xl shadow-2xl border border-slate-200 backdrop-blur-sm">
        {/* Seletor de 6 Cores */}
        <div className="flex gap-2">
            {colors.map((c) => (
                <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-95 ${color === c ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>

        <div className="flex items-center gap-3 border-l border-slate-300 sm:pl-4">
            {/* 2 Espessuras */}
            <div className="flex gap-2">
                <button 
                    onClick={() => setBrushSize(2)}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${brushSize === 2 ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
                >
                    Fino
                </button>
                <button 
                    onClick={() => setBrushSize(5)}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${brushSize === 5 ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
                >
                    Médio
                </button>
            </div>

            <button 
                onClick={clearBoard}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-all active:scale-95"
            >
                Limpar
            </button>
        </div>
      </div>
    </div>
  );
};
