import { useEffect, useState } from "react";
import { getSocket } from "./socket";

export function useAuctionState() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onState(s) {
      setState(s);
    }
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on("state:update", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off("state:update", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { state, connected, socket: getSocket() };
}
