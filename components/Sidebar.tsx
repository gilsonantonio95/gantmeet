
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
    <div className="w-full md:w-[180px] h-full md:h-screen bg-slate-950 md:border-l border-slate-800 flex flex-col shadow-2xl z-50">
      {/* App Header */}
      <div className="p-2 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="min-w-[20px] w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-white">G</div>
          <h1 className="text-[10px] font-bold text-white tracking-tight truncate">GantMeet</h1>
        </div>
        <button 
          onClick={onToggleAlwaysOnTop}
          title="Modo Sempre no Topo"
          className="text-slate-400 hover:text-white p-1 rounded transition-colors hidden md:block"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      </div>

      {/* Container Principal Mobile (flex-row) vs Desktop (flex-col) */}
      <div className="flex flex-col md:flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Webcams Area */}
          <div className="p-1.5 space-y-2 md:space-y-2 space-x-0 flex flex-col md:flex-col shrink-0 overflow-y-auto">
            <div className="flex flex-row md:flex-col gap-2 md:gap-2">
                <div className="flex-1 md:flex-none">
                    <VideoFeed 
                    stream={localStream} 
                    label="Prof." 
                    isMuted 
                    isMirror
                    />
                </div>
                <div className="flex-1 md:flex-none">
                    <VideoFeed 
                    stream={remoteStream} 
                    label="Aluno" 
                    />
                </div>
            </div>
            {isSharingScreen && (
                <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <VideoFeed 
                        stream={screenStream} 
                        label="Tela" 
                    />
                </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="flex-1 p-1.5 flex flex-col min-h-0">
            <Chat />
          </div>
      </div>

      {/* Control Bar */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1.5 shrink-0 pb-6 md:pb-2">
        {callState === CallState.IDLE ? (
          <button 
            onClick={onStartCall}
            className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] font-bold py-3 md:py-2 rounded transition-all flex items-center justify-center gap-1.5 text-white"
          >
            Iniciar Aula
          </button>
        ) : (
          <div className="flex gap-2 md:flex-col md:gap-1.5">
            <button 
              onClick={onShareScreen}
              className={`flex-1 w-full ${isSharingScreen ? 'bg-orange-600 hover:bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'} text-white text-[9px] font-bold py-3 md:py-1.5 rounded transition-all flex items-center justify-center gap-1`}
            >
              {isSharingScreen ? 'Parar Tela' : 'Compartilhar'}
            </button>
            <button 
              onClick={onEndCall}
              className="flex-1 w-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold py-3 md:py-1.5 rounded transition-all flex items-center justify-center gap-1"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
