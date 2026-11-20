import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { usePlayer } from './PlayerContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, serverUrl, isAuthenticated } = useAuth();
  const { currentSong } = usePlayer();
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [friendActivities, setFriendActivities] = useState({});
  const [incomingSharedSong, setIncomingSharedSong] = useState(null);
  const [latestChatMessage, setLatestChatMessage] = useState(null);

  // Initialize Socket connection
  const shareSongWithFriend = async (friendEmail, song) => {
    if (socketRef.current && isConnected) {
      try {
        const result = await socketRef.current.timeout(10000).emitWithAck('share-song', { to: friendEmail, song });
        return result.success === true;
      } catch { return false; }
    }
    return false;
  };

  const sendChatMessage = async (toEmail, content) => {
    if (socketRef.current && isConnected) {
      try {
        const result = await socketRef.current.timeout(10000).emitWithAck('send-chat-message', { to: toEmail, content });
        return result.success === true;
      } catch { return false; }
    }
    return false;
  };

  const clearSharedSongNotification = () => {
    setIncomingSharedSong(null);
  };

  useEffect(() => {
    if (!isAuthenticated || !serverUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket Connected to SangeetX backend:', socket.id);
      setIsConnected(true);

      // Register user on socket server
      if (user) {
        socket.emit('register', {
          id: user.email || user.id,
          name: user.name || 'SangeetX User',
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket Disconnected');
      setIsConnected(false);
    });

    // Listen for live friend playback
    socket.on('friend-now-playing', (data) => {
      if (data && data.username) {
        setFriendActivities((prev) => ({
          ...prev,
          [data.username]: data.song,
        }));
      }
    });

    // Listen for shared song from friend
    socket.on('song-shared', (data) => {
      console.log('🎵 Song shared with you:', data);
      setIncomingSharedSong({
        from: data.from || 'A Friend',
        song: data.song,
        timestamp: Date.now(),
      });
    });

    // Listen for incoming chat message
    socket.on('receive-chat-message', (message) => {
      console.log('💬 Received chat message:', message);
      setLatestChatMessage(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, serverUrl, user?.email, token]);

  // Broadcast now-playing to friends when currentSong changes
  useEffect(() => {
    if (socketRef.current && isConnected && currentSong) {
      socketRef.current.emit('now-playing', {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        image: currentSong.image,
        songName: currentSong.title,
      });
    }
  }, [currentSong?.id, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        friendActivities,
        incomingSharedSong,
        latestChatMessage,
        shareSongWithFriend,
        sendChatMessage,
        clearSharedSongNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
