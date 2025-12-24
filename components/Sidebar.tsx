
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
  
  // Auth Props
  userRole: 'professor' | 'aluno' | null;
  setUserRole: (role: 'professor' | 'aluno' | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  currentRoom: string;
  setCurrentRoom: (room: string) => void;
  password: string;
  setPassword: (pass: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onProfessorLogin: (e: React.FormEvent) => void;
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
  userRole,
  setUserRole,
  isAuthenticated,
  currentRoom,
  setCurrentRoom,
  password,
  setPassword,
  roomCode,
  setRoomCode,
  onProfessorLogin
}) => {
  
  // Se não estiver autenticado ou sem sala, mostra o formulário DENTRO da Sidebar original
  if (!isAuthenticated || !currentRoom) {
    return (
      <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50 p-2 overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-6 justify-center py-2 border-b border-slate-800">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight">GantMeet</h1>
        </div>

        {!userRole ? (
          <div className="flex flex-col gap-2">
             <p className="text-[10px] text-slate-400 text-center mb-2 font-bold uppercase">Entrar como:</p>
             <button onClick={() => setUserRole('professor')} className="bg-blue-600 text-white text-[10px] font-bold py-2 rounded">Professor</button>
             <button onClick={() => setUserRole('aluno')} className="bg-slate-800 text-white text-[10px] font-bold py-2 rounded border border-slate-700">Aluno</button>
          </div>
        ) : (userRole === 'professor' && !isAuthenticated) ? (
          <form onSubmit={onProfessorLogin} className="flex flex-col gap-2">
            <p className="text-[9px] text-slate-500 uppercase font-bold text-center mb-1">Senha Privada</p>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-[10px] outline-none" autoFocus
            />
            <button type="submit" className="bg-blue-600 text-white text-[10px] font-bold py-2 rounded mt-2">Validar</button>
            <button onClick={() => setUserRole(null)} className="text-[9px] text-slate-500 hover:text-white mt-2">← Voltar</button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if(roomCode.trim()) setCurrentRoom(roomCode.trim()); }} className="flex flex-col gap-2">
            <p className="text-[9px] text-slate-500 uppercase font-bold text-center mb-1">Código da Sala</p>
            <input 
              type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-[10px] outline-none uppercase font-mono" autoFocus
            />
            <button type="submit" className="bg-blue-600 text-white text-[10px] font-bold py-2 rounded mt-2">Entrar</button>
            <button onClick={() => setUserRole(null)} className="text-[9px] text-slate-500 hover:text-white mt-2">← Voltar</button>
          </form>
        )}
      </div>
    );
  }

  // Se estiver tudo OK, mostra a Sidebar normal que você aprovou
  return (
    <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50">
      <div className="p-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="min-w-[20px] w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight truncate">GantMeet</h1>
        </div>
        <button onClick={onToggleAlwaysOnTop} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      </div>

      <div className="p-1.5 space-y-2 flex flex-col overflow-y-auto overflow-x-hidden">
        <VideoFeed stream={localStream} label="Prof." isMuted isMirror />
        <VideoFeed stream={remoteStream} label="Aluno" />
        {isSharingScreen && <VideoFeed stream={screenStream} label="Tela" />}
      </div>

      <div className="flex-1 p-1.5 flex flex-col min-h-0">
        <Chat />
      </div>

      <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1.5">
        {callState === CallState.IDLE ? (
          <button onClick={onStartCall} className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] font-bold py-2 rounded text-white">Iniciar</button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button onClick={onShareScreen} className={`w-full ${isSharingScreen ? 'bg-orange-600' : 'bg-slate-700'} text-white text-[9px] font-bold py-1.5 rounded`}>
              {isSharingScreen ? 'Parar Tela' : 'Compartilhar'}
            </button>
            <button onClick={onEndCall} className="w-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold py-1.5 rounded">Sair</button>
          </div>
        )}
      </div>
    </div>
  );
};
