import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const [roomId, setRoomId] = useState('');
    const [inputRoomId, setInputRoomId] = useState('');
    const [status, setStatus] = useState('disconnected'); // disconnected, connected

    useEffect(() => {
        // Load state from local storage
        chrome.storage.local.get(['roomId', 'status'], (result) => {
            if (result.roomId) setRoomId(result.roomId);
            if (result.status) setStatus(result.status);
        });
    }, []);

    const createRoom = () => {
        const newRoomId = uuidv4().substring(0, 8);
        setRoomId(newRoomId);
        setStatus('connected');
        chrome.storage.local.set({ roomId: newRoomId, status: 'connected', role: 'host' });
        // Notify content script
        sendMessageToContentScript({ type: 'JOIN_ROOM', roomId: newRoomId });
    };

    const joinRoom = () => {
        if (!inputRoomId) return;
        setRoomId(inputRoomId);
        setStatus('connected');
        chrome.storage.local.set({ roomId: inputRoomId, status: 'connected', role: 'guest' });
        // Notify content script
        sendMessageToContentScript({ type: 'JOIN_ROOM', roomId: inputRoomId });
    };

    const leaveRoom = () => {
        setStatus('disconnected');
        setRoomId('');
        chrome.storage.local.set({ roomId: '', status: 'disconnected' });
        sendMessageToContentScript({ type: 'LEAVE_ROOM' });
    };

    const sendMessageToContentScript = (message) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    };

    return (
        <div className="w-80 p-4 bg-gray-900 text-white min-h-[300px]">
            <h1 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Universal Watch
            </h1>

            {status === 'disconnected' ? (
                <div className="space-y-4">
                    <button
                        onClick={createRoom}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition"
                    >
                        Create New Room
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-900 text-gray-400">Or join existing</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputRoomId}
                            onChange={(e) => setInputRoomId(e.target.value)}
                            placeholder="Enter Room ID"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={joinRoom}
                            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-bold transition"
                        >
                            Join
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded border border-gray-700">
                        <p className="text-gray-400 text-sm mb-1">Current Room ID:</p>
                        <div className="flex items-center justify-between">
                            <code className="text-lg font-mono text-purple-400">{roomId}</code>
                            <button
                                onClick={() => navigator.clipboard.writeText(roomId)}
                                className="text-xs text-gray-500 hover:text-white"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={leaveRoom}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
                    >
                        Leave Room
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                        Video sync is active on this tab.
                    </p>
                </div>
            )}
        </div>
    );
}

export default App;
