
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CallState } from './types';
import io from 'socket.io-client';

const App: React.FC = () => {
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
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  const ACCESS_PASSWORD = "aula"; // Sua senha única (altere aqui quando quiser)

  useEffect(() => {
    if (!isAuthenticated || !currentRoom) return;

    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin;
    socketRef.current = io(socketUrl);

    socketRef.current.on('other user', (userID: string) => {
      callUser(userID);
    });

    socketRef.current.on('offer', handleReceiveOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidateMsg);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, currentRoom]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const createPeer = (userID: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: userID,
          candidate: e.candidate
        });
      }
    };

    peer.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    return peer;
  };

  const processIceQueue = () => {
    if (peerRef.current && iceCandidatesQueue.current.length > 0) {
        iceCandidatesQueue.current.forEach(candidate => {
            peerRef.current?.addIceCandidate(candidate).catch(e => console.error(e));
        });
        iceCandidatesQueue.current = [];
    }
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

    socketRef.current.emit('offer', {
      target: userID,
      caller: socketRef.current.id,
      sdp: peerRef.current.localDescription
    });
  };

  async function handleReceiveOffer(payload: any) {
    peerRef.current = createPeer(payload.caller);
    const desc = new RTCSessionDescription(payload.sdp);
    await peerRef.current.setRemoteDescription(desc);
    
    processIceQueue();

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            peerRef.current?.addTrack(track, localStreamRef.current!);
        });
    }

    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    socketRef.current.emit('answer', {
      target: payload.caller,
      sdp: peerRef.current.localDescription
    });
  }

  function handleAnswer(payload: any) {
    const desc = new RTCSessionDescription(payload.sdp);
    peerRef.current?.setRemoteDescription(desc).catch(e => console.error(e));
  }

  function handleIceCandidateMsg(candidate: RTCIceCandidate) {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (peerRef.current && peerRef.current.remoteDescription) {
        peerRef.current.addIceCandidate(iceCandidate).catch(e => console.error(e));
    } else {
        iceCandidatesQueue.current.push(iceCandidate);
    }
  }

  const startMedia = async () => {
    try {
      setCallState(CallState.CONNECTING);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
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
    setLocalStream(null);
    setRemoteStream(null);
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
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
      } catch (err) {
        console.error("Erro ao compartilhar tela:", err);
      }
    }
  };

  const enterPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
        alert("Seu navegador não suporta Document Picture-in-Picture.");
        return;
    }

    try {
        // @ts-ignore
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 180,
            height: window.screen.height,
        });

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
            pipWindow.document.head.appendChild(node.cloneNode(true));
        });

        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.padding = '0';
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
    } catch (err) {
        console.error("PiP error:", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#111] justify-end overflow-hidden">
      {!isPipActive && (
        <div className="flex-1 bg-[#757575] flex items-center justify-center p-8 hidden md:flex">
          <div className="text-center">
            <h1 className="text-[64px] font-medium text-white/20 mb-2 tracking-tight">GantMeet</h1>
            <p className="text-xl text-white/20 mb-12">O seu conteúdo de ensino aparecerá aqui.</p>
            <div className="bg-[#4a4a4a] p-6 rounded-lg max-w-md mx-auto shadow-xl">
              <p className="text-white/40 text-sm leading-relaxed">
                Clique no ícone de "duas janelas" no topo da barra para flutuar o app.
              </p>
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
        // Novas props simplificadas
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        currentRoom={currentRoom}
        setCurrentRoom={setCurrentRoom}
        password={password}
        setPassword={setPassword}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        onLogin={handleLogin}
      />
    </div>
  );
};

export default App;
