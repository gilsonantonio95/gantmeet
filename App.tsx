
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CallState } from './types';
import io from 'socket.io-client';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'professor' | 'aluno' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  
  const [callState, setCallState] = useState<CallState>(CallState.IDLE);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  const socketRef = useRef<any>();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const PROFESSOR_PASSWORD = "aula";

  useEffect(() => {
    if (!isAuthenticated || !currentRoom) return;
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin;
    socketRef.current = io(socketUrl);
    socketRef.current.on('other user', (userID: string) => callUser(userID));
    socketRef.current.on('offer', handleReceiveOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidateMsg);
    return () => { socketRef.current?.disconnect(); };
  }, [isAuthenticated, currentRoom]);

  const handleProfessorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PROFESSOR_PASSWORD) setIsAuthenticated(true);
    else alert("Senha de professor incorreta");
  };

  const createPeer = (userID: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('ice-candidate', { target: userID, candidate: e.candidate });
      }
    };
    peer.ontrack = (e) => setRemoteStream(e.streams[0]);
    return peer;
  };

  const callUser = async (userID: string) => {
    peerRef.current = createPeer(userID);
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            peerRef.current?.addTrack(track, localStreamRef.current!);
        });
    }
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    socketRef.current.emit('offer', { target: userID, caller: socketRef.current.id, sdp: peerRef.current.localDescription });
  };

  async function handleReceiveOffer(payload: any) {
    peerRef.current = createPeer(payload.caller);
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            peerRef.current?.addTrack(track, localStreamRef.current!);
        });
    }
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);
    socketRef.current.emit('answer', { target: payload.caller, sdp: peerRef.current.localDescription });
  }

  function handleAnswer(payload: any) {
    peerRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  }

  function handleIceCandidateMsg(candidate: RTCIceCandidate) {
    peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
  }

  const startMedia = async () => {
    try {
      setCallState(CallState.CONNECTING);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
        },
        audio: true
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current.emit('join', currentRoom);
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
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      if (peerRef.current && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        if (peerRef.current) {
            const videoTrack = stream.getVideoTracks()[0];
            const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
        }
        stream.getVideoTracks()[0].onended = () => {
            setScreenStream(null);
            if (peerRef.current && localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(videoTrack);
            }
        };
      } catch (err) {
        console.error("Erro ao compartilhar tela:", err);
      }
    }
  };

  const enterPiP = async () => {
    if (!('documentPictureInPicture' in window)) return;
    try {
        // @ts-ignore
        const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 180, height: window.screen.height });
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
            pipWindow.document.head.appendChild(node.cloneNode(true));
        });
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.backgroundColor = '#020617';
        pipWindow.document.body.style.overflow = 'hidden';
        const root = document.getElementById('root');
        if (root) {
            root.style.width = '100%';
            root.style.height = '100%';
            pipWindow.document.body.appendChild(root);
            setIsPipActive(true);
            pipWindow.addEventListener('pagehide', () => {
                root.style.width = '';
                root.style.height = '';
                document.body.appendChild(root);
                setIsPipActive(false);
            });
        }
    } catch (err) { console.error(err); }
  };

  if (!userRole) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl w-full max-w-sm text-center">
            <div className="flex items-center gap-3 mb-8 justify-center">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white">G</div>
                <h1 className="text-2xl font-bold text-white tracking-tight">GantMeet</h1>
            </div>
            <p className="text-slate-400 mb-6">Como você deseja entrar?</p>
            <div className="flex flex-col gap-3">
                <button onClick={() => setUserRole('professor')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
                    Sou o Professor
                </button>
                <button onClick={() => setUserRole('aluno')} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-all border border-slate-700">
                    Sou o Aluno
                </button>
            </div>
        </div>
      </div>
    );
  }

  if (userRole === 'professor' && !isAuthenticated) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleProfessorLogin} className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl w-full max-w-sm">
          <button onClick={() => setUserRole(null)} className="text-slate-500 text-xs mb-4 hover:text-white">← Voltar</button>
          <h2 className="text-xl font-bold text-white mb-6 text-center">Acesso do Professor</h2>
          <input 
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha privada"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
            Validar Senha
          </button>
        </form>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (roomCode.trim()) { setIsAuthenticated(true); setCurrentRoom(roomCode.trim()); } }} className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl w-full max-w-sm">
          <button onClick={() => { setIsAuthenticated(false); setUserRole(null); }} className="text-slate-500 text-xs mb-4 hover:text-white">← Voltar</button>
          <h2 className="text-xl font-bold text-white mb-2 text-center">{userRole === 'professor' ? 'Criar Sala' : 'Entrar na Sala'}</h2>
          <input 
            type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Ex: aula-de-hoje"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
            autoFocus
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
            {userRole === 'professor' ? 'Abrir Sala' : 'Entrar na Aula'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-transparent overflow-hidden ${isPipActive ? 'justify-stretch' : 'justify-center sm:justify-end'}`}>
      {!isPipActive && (
        <div className="flex-1 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/20 p-8 hidden md:flex">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">GantMeet</h1>
            <p className="text-xl">O seu conteúdo de ensino aparecerá aqui.</p>
            <div className="mt-6 flex flex-col items-center gap-2">
                <span className="text-xs bg-blue-600/30 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 uppercase font-bold tracking-widest">SALA: {currentRoom}</span>
            </div>
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
