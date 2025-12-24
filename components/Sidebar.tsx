
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
  screenStream
}) => {
  return (
    <>
      {/* 
        LAYOUT DESKTOP (Sempre visível em md: e acima)
        Esta é a barra lateral de 180px que você aprovou.
        Ela é FIXA e ABSOLUTA no desktop.
      */}
      <div className="hidden md:flex w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex-col shadow-2xl z-50 fixed right-0 top-0">
        {/* App Header */}
        <div className="p-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="min-w-[20px] w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
            <h1 className="text-[10px] font-bold text-white tracking-tight truncate">GantMeet</h1>
          </div>
          <button 
            onClick={onToggleAlwaysOnTop}
            title="Modo Sempre no Topo"
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>

        {/* Webcams */}
        <div className="p-1.5 space-y-2 flex flex-col overflow-y-auto">
          <VideoFeed stream={localStream} label="Prof." isMuted isMirror />
          <VideoFeed stream={remoteStream} label="Aluno" />
          {isSharingScreen && <VideoFeed stream={screenStream} label="Tela" />}
        </div>

        {/* Chat */}
        <div className="flex-1 p-1.5 flex flex-col min-h-0">
          <Chat />
        </div>

        {/* Controls */}
        <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1.5">
          {callState === CallState.IDLE ? (
            <button onClick={onStartCall} className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] font-bold py-2 rounded text-white">Iniciar</button>
          ) : (
            <>
              <button onClick={onShareScreen} className={`w-full ${isSharingScreen ? 'bg-orange-600' : 'bg-slate-700'} text-white text-[9px] font-bold py-1.5 rounded`}>{isSharingScreen ? 'Parar' : 'Tela'}</button>
              <button onClick={onEndCall} className="w-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold py-1.5 rounded">Sair</button>
            </>
          )}
        </div>
      </div>

      {/* 
        LAYOUT MOBILE (Sempre visível ABAIXO de md:)
        Este é um layout de "Aplicativo" em tela cheia.
        Ele NUNCA afeta o desktop porque está escondido lá.
      */}
      <div className="md:hidden flex flex-col h-screen w-full bg-slate-950 fixed inset-0 z-50">
        <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
            <h1 className="text-lg font-bold text-white">GantMeet</h1>
            <div className="flex gap-2">
                {callState === CallState.ACTIVE && (
                     <button onClick={onEndCall} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Sair</button>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
             <div className="grid grid-cols-2 gap-2">
                <VideoFeed stream={localStream} label="Você" isMuted isMirror />
                <VideoFeed stream={remoteStream} label="Remoto" />
             </div>
             {isSharingScreen && <VideoFeed stream={screenStream} label="Tela Compartilhada" />}
             
             <div className="flex-1 bg-slate-900 rounded border border-slate-800 h-[300px] mt-2">
                 <Chat />
             </div>
        </div>

        {callState === CallState.IDLE && (
            <div className="p-4 bg-slate-900 mt-auto">
                 <button onClick={onStartCall} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Iniciar Chamada</button>
            </div>
        )}
      </div>
    </>
  );
};
