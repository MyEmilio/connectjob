import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  const SERVER_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace("/api", "");
  socket = io(SERVER_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
