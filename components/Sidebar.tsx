
import React from 'react';
import { VideoFeed } from './VideoFeed';
import { Chat } from './Chat';
import { CallState } from '../types';

interface SidebarProps {
  callState: CallState;
  onStartCall: () => void;
  onEndCall: () => void;
  onShareScreen: () => void;
  onToggleAlwaysOnTop: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isSharingScreen: boolean;
  screenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  currentRoom: string;
  setCurrentRoom: (room: string) => void;
  password: string;
  setPassword: (pass: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onLogin: (e: React.FormEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  callState,
  onStartCall,
  onEndCall,
  onShareScreen,
  onToggleAlwaysOnTop,
  localStream,
  remoteStream,
  isSharingScreen,
  screenStream,
  remoteScreenStream,
  isAuthenticated,
  currentRoom,
  setCurrentRoom,
  password,
  setPassword,
  roomCode,
  setRoomCode,
  onLogin
}) => {
  
  if (!isAuthenticated) {
    return (
      <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50 p-3">
        <div className="flex items-center gap-1.5 mb-8 justify-center py-2 border-b border-slate-800">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight">GantMeet</h1>
        </div>
        <form onSubmit={onLogin} className="flex flex-col gap-3">
          <p className="text-[9px] text-slate-500 uppercase font-bold text-center">Senha de Acesso</p>
          <input 
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded p-2 text-white text-[10px] outline-none" autoFocus
          />
          <button type="submit" className="bg-blue-600 text-white text-[10px] font-bold py-2 rounded">Entrar</button>
        </form>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50 p-3">
        <div className="flex items-center gap-1.5 mb-8 justify-center py-2 border-b border-slate-800">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight">GantMeet</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if(roomCode.trim()) setCurrentRoom(roomCode.trim().toUpperCase()); }} className="flex flex-col gap-3">
          <p className="text-[9px] text-slate-500 uppercase font-bold text-center">Sala</p>
          <input 
            type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded p-2 text-white text-[10px] outline-none uppercase font-mono" autoFocus
          />
          <button type="submit" className="bg-blue-600 text-white text-[10px] font-bold py-2 rounded">Acessar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50">
      <div className="p-2 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="min-w-[20px] w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight truncate">GantMeet</h1>
        </div>
        <button onClick={onToggleAlwaysOnTop} className="text-slate-400 hover:text-white p-1 rounded">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      </div>

      {/* Área com Scroll Vertical se necessário */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-2 custom-scrollbar">
        <VideoFeed stream={localStream} label="Prof." isMuted isMirror />
        <VideoFeed stream={remoteStream} label="Aluno" />
        
        {/* Mostra a tela local ou a tela remota */}
        {(isSharingScreen || remoteScreenStream) && (
            <VideoFeed 
                stream={isSharingScreen ? screenStream : remoteScreenStream} 
                label="Tela" 
            />
        )}

        {/* Chat movido para dentro da área de scroll na Sidebar para dar mais espaço vertical */}
        <div className="h-[250px] mt-4 border-t border-slate-800 pt-2">
            <Chat />
        </div>
      </div>

      <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1.5 shrink-0">
        {callState === CallState.IDLE ? (
          <button onClick={onStartCall} className="w-full bg-blue-600 text-white text-[10px] font-bold py-2 rounded">Iniciar</button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button onClick={onShareScreen} className={`w-full ${isSharingScreen ? 'bg-orange-600' : 'bg-slate-700'} text-white text-[9px] font-bold py-1.5 rounded`}>
              {isSharingScreen ? 'Parar Tela' : 'Compartilhar'}
            </button>
            <button onClick={onEndCall} className="w-full bg-red-600 text-white text-[9px] font-bold py-1.5 rounded">Sair</button>
          </div>
        )}
      </div>
    </div>
  );
};
