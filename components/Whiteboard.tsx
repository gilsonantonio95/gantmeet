
import React, { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
}

interface WhiteboardProps {
  socket: any;
  currentRoom: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ socket, currentRoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeId = useRef<string | null>(null);

  const colors = ['#000000', '#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];

  // Redesenhar tudo quando os strokes mudarem
  useEffect(() => {
    drawAll();
  }, [strokes]);

  useEffect(() => {
    if (!socket) return;

    const handleRemoteStrokeStart = (data: any) => {
      setStrokes(prev => [...prev, { ...data, points: [data.startPoint] }]);
    };

    const handleRemoteStrokeUpdate = (data: any) => {
      setStrokes(prev => prev.map(s => 
        s.id === data.id ? { ...s, points: [...s.points, data.point] } : s
      ));
    };

    const handleRemoteStrokeRemove = (id: string) => {
      setStrokes(prev => prev.filter(s => s.id !== id));
    };

    const handleClear = () => {
      setStrokes([]);
    };

    socket.on('stroke-start', handleRemoteStrokeStart);
    socket.on('stroke-update', handleRemoteStrokeUpdate);
    socket.on('stroke-remove', handleRemoteStrokeRemove);
    socket.on('clear-board', handleClear);

    return () => {
      socket.off('stroke-start');
      socket.off('stroke-update');
      socket.off('stroke-remove');
      socket.off('clear-board');
    };
  }, [socket]);

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

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

  const startAction = (e: React.MouseEvent) => {
    const pos = getPos(e);

    if (tool === 'eraser') {
      eraseAt(pos);
      return;
    }

    setIsDrawing(true);
    const id = Date.now().toString();
    currentStrokeId.current = id;
    
    const newStroke: Stroke = {
      id,
      points: [pos],
      color,
      size: brushSize
    };

    setStrokes(prev => [...prev, newStroke]);
    socket.emit('stroke-start', { ...newStroke, startPoint: pos });
  };

  const performAction = (e: React.MouseEvent) => {
    const pos = getPos(e);

    if (tool === 'eraser') {
      if (e.buttons === 1) eraseAt(pos);
      return;
    }

    if (!isDrawing || !currentStrokeId.current) return;

    setStrokes(prev => prev.map(s => 
      s.id === currentStrokeId.current ? { ...s, points: [...s.points, pos] } : s
    ));
    
    socket.emit('stroke-update', { id: currentStrokeId.current, point: pos });
  };

  const stopAction = () => {
    setIsDrawing(false);
    currentStrokeId.current = null;
  };

  const eraseAt = (pos: Point) => {
    // Encontrar o stroke mais próximo do ponto
    const threshold = 10;
    const strokeToRemove = strokes.find(stroke => {
      return stroke.points.some((p, i) => {
        if (i === 0) return false;
        const prev = stroke.points[i-1];
        return distToSegment(pos, prev, p) < (threshold + stroke.size / 2);
      });
    });

    if (strokeToRemove) {
      setStrokes(prev => prev.filter(s => s.id !== strokeToRemove.id));
      socket.emit('stroke-remove', strokeToRemove.id);
    }
  };

  // Funções matemáticas para detecção de colisão (borracha)
  const dist2 = (v: Point, w: Point) => Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = dist2(v, w);
    if (l2 === 0) return Math.sqrt(dist2(p, v));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }));
  };

  const clearBoard = () => {
    setStrokes([]);
    socket.emit('clear-board');
  };

  return (
    <div className="relative w-full h-full bg-white overflow-auto flex flex-col" ref={containerRef}>
      {/* Container de Scroll da Lousa */}
      <div className="flex-1 overflow-auto bg-slate-200 p-8 custom-scrollbar">
        <div 
          className="bg-white shadow-2xl mx-auto relative cursor-crosshair"
          style={{ width: '1200px', height: '3000px' }}
        >
          <canvas
            ref={canvasRef}
            width={1200}
            height={3000}
            onMouseDown={startAction}
            onMouseMove={performAction}
            onMouseUp={stopAction}
            onMouseOut={stopAction}
            className="absolute inset-0"
          />
        </div>
      </div>
      
      {/* Toolbar da Lousa - Flutuante */}
      <div className="absolute top-4 left-4 flex flex-col gap-3 bg-slate-100/90 p-3 rounded-xl shadow-2xl border border-slate-200 backdrop-blur-sm z-10">
        <div className="flex gap-2 pb-2 border-b border-slate-200">
            {colors.map((c) => (
                <button 
                    key={c}
                    onClick={() => { setColor(c); setTool('pen'); }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-95 ${color === c && tool === 'pen' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setTool('eraser')}
                className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                title="Borracha (apaga traços completos)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
            
            <div className="h-6 w-px bg-slate-300 mx-1" />

            <button 
                onClick={() => { setBrushSize(2); setTool('pen'); }}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${brushSize === 2 && tool === 'pen' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
            >
                Fino
            </button>
            <button 
                onClick={() => { setBrushSize(4); setTool('pen'); }}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${brushSize === 4 && tool === 'pen' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
            >
                Médio
            </button>

            <div className="h-6 w-px bg-slate-300 mx-1" />

            <button 
                onClick={clearBoard}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-all"
            >
                Limpar
            </button>
        </div>
      </div>
    </div>
  );
};
