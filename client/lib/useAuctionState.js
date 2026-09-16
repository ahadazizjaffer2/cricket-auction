import { useEffect, useState } from "react";
import { getSocket } from "./socket";

export function useAuctionState() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

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
    function onClockSync({ now }) {
      setClockOffset(now - Date.now());
    }

    socket.on("state:update", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("clock:sync", onClockSync);
    setConnected(socket.connected);

    return () => {
      socket.off("state:update", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("clock:sync", onClockSync);
    };
  }, []);

  return { state, connected, clockOffset, socket: getSocket() };
}

export function useCountdown(timerEndsAt, clockOffset) {
  const [msLeft, setMsLeft] = useState(null);

  useEffect(() => {
    if (!timerEndsAt) {
      setMsLeft(null);
      return;
    }
    const iv = setInterval(() => {
      const now = Date.now() + clockOffset;
      setMsLeft(Math.max(0, timerEndsAt - now));
    }, 200);
    return () => clearInterval(iv);
  }, [timerEndsAt, clockOffset]);

  return msLeft;
}
