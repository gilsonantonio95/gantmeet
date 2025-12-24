
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CallState } from './types';

const App: React.FC = () => {
  const [callState, setCallState] = useState<CallState>(CallState.IDLE);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  // Initialize camera and mic
  const startMedia = async () => {
    try {
      setCallState(CallState.CONNECTING);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      // Simulating a remote student stream for the prototype
      setRemoteStream(stream.clone()); 
      
      setCallState(CallState.ACTIVE);
    } catch (error) {
      console.error("Erro ao acessar mídia:", error);
      alert("Por favor, permita acesso à câmera e microfone.");
      setCallState(CallState.IDLE);
    }
  };

  const stopMedia = () => {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setCallState(CallState.IDLE);
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) {
        console.error("Erro ao compartilhar tela:", err);
      }
    }
  };

  const enterPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
        alert("Seu navegador não suporta Document Picture-in-Picture. Use o Chrome ou Edge recente.");
        return;
    }

    try {
        // @ts-ignore
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 180, // Largura ainda mais estreita
            height: window.screen.height,
        });

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
            pipWindow.document.head.appendChild(node.cloneNode(true));
        });

        const root = document.getElementById('root');
        if (root) {
            pipWindow.document.body.appendChild(root);
            setIsPipActive(true);

            pipWindow.addEventListener('pagehide', () => {
                document.body.appendChild(root);
                setIsPipActive(false);
            });
        }
    } catch (err) {
        console.error("PiP error:", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-transparent justify-end overflow-hidden">
      {!isPipActive && (
        <div className="flex-1 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/20 p-8 hidden md:flex">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">GantMeet</h1>
            <p className="text-xl">O seu conteúdo de ensino aparecerá aqui.</p>
            <p className="mt-4 text-sm bg-slate-800/50 p-4 rounded-lg border border-white/10">
              Clique no ícone de "duas janelas" no topo da barra para flutuar o app.
            </p>
          </div>
        </div>
      )}

      <Sidebar 
        callState={callState}
        onStartCall={startMedia}
        onEndCall={stopMedia}
        onShareScreen={toggleScreenShare}
        onToggleAlwaysOnTop={enterPiP}
        localStream={localStream}
        remoteStream={remoteStream}
        isSharingScreen={!!screenStream}
        screenStream={screenStream}
      />
    </div>
  );
};

export default App;
