import React, { useState, useEffect, useRef } from 'react';
import { socketManager } from './SocketManager';
import { peerManager } from './PeerManager';
import { Minimize2, Maximize2, Video, Mic, Share2, Send, MicOff, VideoOff, Users, X, MessageSquare, Monitor } from 'lucide-react';

const Overlay = ({ roomId, onClose }) => {
    const [activeTab, setActiveTab] = useState('chat'); // chat, video
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [remoteVideoStatus, setRemoteVideoStatus] = useState({}); // { [peerId]: boolean }
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    const messagesEndRef = useRef(null);
    const localVideoRef = useRef(null);

    useEffect(() => {
        const onMessage = (data) => setMessages(prev => [...prev, data]);
        const onSystem = (text) => setMessages(prev => [...prev, { system: true, text }]);
        const onUserJoined = (userData) => {
            if (userData && userData.peerId) {
                peerManager.callPeer(userData.peerId);
                setRemoteVideoStatus(prev => ({ ...prev, [userData.peerId]: true }));
            }
        };
        const onUserLeft = (peerId) => {
            setRemoteStreams(prev => {
                const newSt = { ...prev };
                delete newSt[peerId];
                return newSt;
            });
            setRemoteVideoStatus(prev => {
                const newSt = { ...prev };
                delete newSt[peerId];
                return newSt;
            });
            if (peerManager.peers[peerId]) {
                peerManager.peers[peerId].close();
                delete peerManager.peers[peerId];
            }
        };
        const onVideoStatus = (status) => {
            if (status && status.peerId) {
                setRemoteVideoStatus(prev => ({ ...prev, [status.peerId]: status.isVideoOn }));
            }
        };

        socketManager.on('chat-message', onMessage);
        socketManager.on('system-message', onSystem);
        socketManager.on('user-joined', onUserJoined);
        socketManager.on('user-left', onUserLeft);
        socketManager.on('user-video-status', onVideoStatus);

        const initPeer = async () => {
            try {
                const stream = await peerManager.callbackMedia();
                if (stream) {
                    setLocalStream(stream);
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                }
                peerManager.init((myPeerId) => {
                    socketManager.joinRoom(roomId, { peerId: myPeerId });
                    socketManager.sendUserVideoStatus(true, myPeerId);
                });
                peerManager.onStream((peerId, stream) => {
                    setRemoteStreams(prev => {
                        if (!stream) {
                            const newSt = { ...prev };
                            delete newSt[peerId];
                            return newSt;
                        }
                        return { ...prev, [peerId]: stream };
                    });
                    setRemoteVideoStatus(prev => ({ ...prev, [peerId]: prev[peerId] ?? true }));
                });
            } catch (e) {
                console.error("Peer init failed", e);
            }
        };

        initPeer();
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        socketManager.sendMessage(newMessage);
        setNewMessage('');
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const toggleCam = async () => {
        let newStatus = false;
        if (isCamOn) {
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.stop();
                    localStream.removeTrack(videoTrack);
                }
            }
            setIsCamOn(false);
            peerManager.replaceVideoTrack(null);
            newStatus = false;
        } else {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = newStream.getVideoTracks()[0];
                if (localStream) {
                    localStream.addTrack(newVideoTrack);
                }
                setIsCamOn(true);
                peerManager.replaceVideoTrack(newVideoTrack);
                newStatus = true;
            } catch (e) {
                console.error("Failed to restart camera", e);
            }
        }

        if (peerManager.peer) {
            socketManager.sendUserVideoStatus(newStatus, peerManager.peer.id);
        }
    };

    // --- UI Render ---

    return (
        <div className={`fixed top-4 right-4 h-[calc(100vh-32px)] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 z-[2147483647] flex flex-col font-sans overflow-hidden ring-1 ring-white/5 ${collapsed ? 'w-[72px]' : 'w-[360px]'}`}>

            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20"></div>
                        </div>
                        <span className="font-bold text-white tracking-wide text-base bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">UNIVERSAL WATCH</span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all duration-200 active:scale-95"
                >
                    {collapsed ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
                </button>
            </div>

            {collapsed ? (
                // Collapsed Icons
                <div className="flex flex-col items-center gap-4 mt-6">
                    <div className="p-3.5 rounded-2xl bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/20 shadow-lg shadow-purple-900/20">
                        <MessageSquare size={22} />
                    </div>
                    <div className="p-3.5 rounded-2xl hover:bg-white/10 text-gray-400 transition-colors">
                        <Users size={22} />
                    </div>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className="flex p-3 gap-2">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'chat' ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'video' ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Video ({Object.keys(remoteStreams).length + 1})
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative bg-black/20">

                        {/* Chat Tab */}
                        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {messages.map((msg, idx) => (
                                    msg.system ? (
                                        <div key={idx} className="flex justify-center my-2">
                                            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 shadow-sm">{msg.text}</span>
                                        </div>
                                    ) : (
                                        <div key={idx} className={`flex flex-col ${msg.sender === socketManager.userId ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-md ${msg.sender === socketManager.userId
                                                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm shadow-purple-900/30'
                                                    : 'bg-white/10 text-gray-100 rounded-bl-sm border border-white/5'
                                                }`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[11px] text-gray-500 mt-1.5 px-1 font-medium">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent border-t border-white/5">
                                <form onSubmit={handleSend} className="relative group">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-5 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner"
                                        autoFocus
                                    />
                                    <button type="submit" className="absolute right-2 top-2 p-2 bg-purple-600 rounded-xl text-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 hover:bg-purple-500 shadow-lg shadow-purple-900/30">
                                        <Send size={16} />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Video Tab */}
                        <div className={`absolute inset-0 overflow-y-auto p-3 space-y-3 transition-opacity duration-300 ${activeTab === 'video' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            {/* Local User */}
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-xl group transition-transform hover:scale-[1.02] duration-300">
                                {isCamOn ? (
                                    <video ref={localVideoRef} muted autoPlay playsInline className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
                                        <div className="p-5 rounded-full bg-white/5 mb-3 ring-1 ring-white/10 shadow-inner">
                                            <Users size={36} className="opacity-70" />
                                        </div>
                                        <span className="text-sm font-semibold tracking-wide text-gray-400">Camera Off</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                    <span className="text-xs font-bold text-white shadow-black drop-shadow-md bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/5">You</span>
                                </div>

                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                                    <div className={`p-1.5 rounded-lg backdrop-blur-md border border-white/10 ${!isMicOn ? 'bg-red-500/90 shadow-red-900/20' : 'bg-black/60 text-emerald-400'}`}>
                                        {isMicOn ? <Mic size={14} /> : <MicOff size={14} className="text-white" />}
                                    </div>
                                    <div className={`p-1.5 rounded-lg backdrop-blur-md border border-white/10 ${!isCamOn ? 'bg-red-500/90 shadow-red-900/20' : 'bg-black/60 text-emerald-400'}`}>
                                        {isCamOn ? <Video size={14} /> : <VideoOff size={14} className="text-white" />}
                                    </div>
                                </div>
                            </div>

                            {/* Remote Users */}
                            {Object.entries(remoteStreams).map(([peerId, stream]) => (
                                <RemoteVideo
                                    key={peerId}
                                    peerId={peerId}
                                    stream={stream}
                                    isVideoOn={remoteVideoStatus[peerId]}
                                />
                            ))}

                            {Object.keys(remoteStreams).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                    <div className="p-4 bg-white/5 rounded-full mb-4 ring-1 ring-white/5">
                                        <Users size={40} className="opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Waiting for friends...</p>
                                    <button onClick={() => navigator.clipboard.writeText(roomId)} className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 active:scale-95">
                                        <Share2 size={16} /> Copy Room ID
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-lg grid grid-cols-4 gap-3">
                        <button onClick={toggleMic} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 active:scale-95 ${isMicOn ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
                            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button onClick={toggleCam} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 active:scale-95 ${isCamOn ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
                            {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(roomId)} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-white/5">
                            <Share2 size={20} />
                        </button>
                        <button onClick={onClose} className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all duration-200 active:scale-95 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <X size={20} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const RemoteVideo = ({ peerId, stream, isVideoOn }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 ring-1 ring-white/10 shadow-xl group">
            {isVideoOn !== false ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
                    <div className="p-5 rounded-full bg-white/5 mb-3 ring-1 ring-white/10 shadow-inner">
                        <Users size={36} className="opacity-70" />
                    </div>
                </div>
            )}
            <div className="absolute bottom-3 left-3">
                <span className="text-xs font-bold text-white shadow-black drop-shadow-md bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/5">User {peerId.substr(0, 4)}</span>
            </div>
        </div>
    );
};

export default Overlay;
