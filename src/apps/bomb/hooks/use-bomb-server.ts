import { useState, useEffect, useCallback, useRef } from "react";
import type {
  BombClientMessage,
  BombServerMessage,
} from "../server/protocol.ts";
import type { BombGameConfig, BombGameState } from "../game/index.ts";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface LobbyPlayer {
  readonly name: string;
}

export interface BombServerConnection {
  readonly status: ConnectionStatus;
  readonly playerId: number | null;
  readonly config: BombGameConfig | null;
  readonly roomCode: string | null;
  readonly lobbyPlayers: ReadonlyArray<LobbyPlayer>;
  readonly gameState: BombGameState | null;
  readonly gameOver: BombGameState | null;
  readonly send: (msg: BombClientMessage) => void;
}

export type JoinMode = "matchmake" | "create" | "join" | "join-local"

export function useBombServer(
  address: string,
  playerName: string,
  joinMode: JoinMode = "matchmake",
  roomCode?: string,
): BombServerConnection {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [config, setConfig] = useState<BombGameConfig | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<ReadonlyArray<LobbyPlayer>>(
    [],
  );
  const [gameState, setGameState] = useState<BombGameState | null>(null);
  const [gameOver, setGameOver] = useState<BombGameState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    function connect() {
      if (cancelled) return;
      const protocol = address.includes("fly.dev") || address.includes("railway.app") ? "wss" : "ws";
      ws = new WebSocket(`${protocol}://${address}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        switch (joinMode) {
          case "matchmake":
            ws!.send(JSON.stringify({ type: "matchmake", playerName }));
            break;
          case "create":
            ws!.send(JSON.stringify({ type: "create_room", playerName }));
            break;
          case "join":
            ws!.send(JSON.stringify({ type: "join", playerName, roomCode }));
            break;
          case "join-local":
            ws!.send(JSON.stringify({ type: "join", playerName }));
            break;
        }
      };

      ws.onmessage = (event) => {
        const msg: BombServerMessage = JSON.parse(event.data as string);
        switch (msg.type) {
          case "welcome":
            setPlayerId(msg.playerId);
            setConfig(msg.config);
            setCurrentRoomCode(msg.roomCode);
            break;
          case "lobby":
            setLobbyPlayers(msg.players);
            break;
          case "game_state":
            setGameState(msg.state);
            setGameOver(null);
            break;
          case "game_over":
            setGameOver(msg.state);
            setGameState(null);
            break;
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          setStatus("connecting");
          setTimeout(connect, 500);
        }
      };
      ws.onerror = () => {};
    }

    const timer = setTimeout(connect, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [address, playerName, joinMode, roomCode]);

  const send = useCallback((msg: BombClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  return { status, playerId, config, roomCode: currentRoomCode, lobbyPlayers, gameState, gameOver, send };
}
