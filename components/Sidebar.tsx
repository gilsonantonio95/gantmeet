
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
    <div className="w-[180px] h-screen bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50">
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

      {/* Webcams 4:3 */}
      <div className="p-1.5 space-y-2 flex flex-col overflow-y-auto overflow-x-hidden">
        <VideoFeed 
          stream={localStream} 
          label="Prof." 
          isMuted 
          isMirror
        />
        <VideoFeed 
          stream={remoteStream} 
          label="Aluno" 
        />
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

      {/* Control Bar */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1.5">
        {callState === CallState.IDLE ? (
          <button 
            onClick={onStartCall}
            className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center gap-1.5 text-white"
          >
            Iniciar
          </button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={onShareScreen}
              className={`w-full ${isSharingScreen ? 'bg-orange-600 hover:bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'} text-white text-[9px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1`}
            >
              {isSharingScreen ? 'Parar Tela' : 'Compartilhar'}
            </button>
            <button 
              onClick={onEndCall}
              className="w-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
