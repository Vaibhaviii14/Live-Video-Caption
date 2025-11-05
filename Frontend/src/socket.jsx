// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  cors: { origin: "*" },
});

socket.on("connect", () => {
  console.log("✅ Connected to backend via socket");
});

socket.on("disconnect", () => {
  console.warn("⚠️ Disconnected from backend");
});

export default socket;
