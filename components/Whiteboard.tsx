
import React, { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  size: number;
}

interface ImageObject {
  id: string;
  type: 'image';
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type WhiteboardObject = Stroke | ImageObject;

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
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const currentStrokeId = useRef<string | null>(null);

  const colors = ['#000000', '#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];

  useEffect(() => {
    drawAll();
  }, [objects]);

  useEffect(() => {
    if (!socket) return;

    const handleRemoteStrokeStart = (data: any) => {
      setObjects(prev => [...prev, { ...data, type: 'stroke', points: [data.startPoint] }]);
    };

    const handleRemoteStrokeUpdate = (data: any) => {
      setObjects(prev => prev.map(obj => 
        (obj.type === 'stroke' && obj.id === data.id) 
          ? { ...obj, points: [...obj.points, data.point] } 
          : obj
      ));
    };

    const handleRemoteImageAdd = (data: any) => {
      setObjects(prev => [...prev, data]);
    };

    const handleRemoteRemove = (id: string) => {
      setObjects(prev => prev.filter(obj => obj.id !== id));
    };

    const handleClear = () => {
      setObjects([]);
    };

    socket.on('stroke-start', handleRemoteStrokeStart);
    socket.on('stroke-update', handleRemoteStrokeUpdate);
    socket.on('image-add', handleRemoteImageAdd);
    socket.on('object-remove', handleRemoteRemove);
    socket.on('clear-board', handleClear);

    // Adicionar listener de colar (paste)
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              
              // Pegar posição atual do scroll para colar onde o usuário está vendo
              const scrollY = containerRef.current?.scrollTop || 0;
              const scrollX = containerRef.current?.scrollLeft || 0;
              
              // Ajustar tamanho mantendo proporção
              const maxWidth = 1000;
              let width = img.width;
              let height = img.height;
              if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
              }

              const newImage: ImageObject = {
                id: Date.now().toString(),
                type: 'image',
                dataUrl,
                x: scrollX + 50,
                y: scrollY + 50,
                width,
                height
              };

              setObjects(prev => [...prev, newImage]);
              socket.emit('image-add', newImage);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      socket.off('stroke-start');
      socket.off('stroke-update');
      socket.off('image-add');
      socket.off('object-remove');
      socket.off('clear-board');
      window.removeEventListener('paste', handlePaste);
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

    objects.forEach(obj => {
      if (obj.type === 'stroke') {
        if (obj.points.length < 2) return;
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = obj.size;
        ctx.beginPath();
        ctx.moveTo(obj.points[0].x, obj.points[0].y);
        for (let i = 1; i < obj.points.length; i++) {
          ctx.lineTo(obj.points[i].x, obj.points[i].y);
        }
        ctx.stroke();
      } else if (obj.type === 'image') {
        const img = new Image();
        img.src = obj.dataUrl;
        // Nota: O desenho de imagens em canvas via loop pode ser lento se não estiver em cache
        // mas para 1 slide por vez funciona bem.
        ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
      }
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
      type: 'stroke',
      points: [pos],
      color,
      size: brushSize
    };

    setObjects(prev => [...prev, newStroke]);
    socket.emit('stroke-start', { ...newStroke, startPoint: pos });
  };

  const performAction = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (tool === 'eraser') {
      if (e.buttons === 1) eraseAt(pos);
      return;
    }

    if (!isDrawing || !currentStrokeId.current) return;

    setObjects(prev => prev.map(obj => 
      (obj.type === 'stroke' && obj.id === currentStrokeId.current) 
        ? { ...obj, points: [...obj.points, pos] } 
        : obj
    ));
    
    socket.emit('stroke-update', { id: currentStrokeId.current, point: pos });
  };

  const stopAction = () => {
    setIsDrawing(false);
    currentStrokeId.current = null;
  };

  const eraseAt = (pos: Point) => {
    // 1. Verificar se clicou em uma imagem
    const imageToRemove = objects.find(obj => {
      if (obj.type !== 'image') return false;
      return pos.x >= obj.x && pos.x <= obj.x + obj.width &&
             pos.y >= obj.y && pos.y <= obj.y + obj.height;
    });

    if (imageToRemove) {
      setObjects(prev => prev.filter(obj => obj.id !== imageToRemove.id));
      socket.emit('object-remove', imageToRemove.id);
      return;
    }

    // 2. Verificar se clicou em um stroke
    const threshold = 10;
    const strokeToRemove = objects.find(obj => {
      if (obj.type !== 'stroke') return false;
      return obj.points.some((p, i) => {
        if (i === 0) return false;
        const prev = obj.points[i-1];
        return distToSegment(pos, prev, p) < (threshold + obj.size / 2);
      });
    });

    if (strokeToRemove) {
      setObjects(prev => prev.filter(obj => obj.id !== strokeToRemove.id));
      socket.emit('object-remove', strokeToRemove.id);
    }
  };

  const dist2 = (v: Point, w: Point) => Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = dist2(v, w);
    if (l2 === 0) return Math.sqrt(dist2(p, v));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }));
  };

  const clearBoard = () => {
    setObjects([]);
    socket.emit('clear-board');
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto bg-slate-200 p-8 custom-scrollbar" ref={containerRef}>
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
                title="Borracha (clique no slide ou traço para apagar)"
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
            <button onClick={clearBoard} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">Limpar</button>
        </div>
      </div>
    </div>
  );
};
