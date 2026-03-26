import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  app.use(express.json());

  // In-memory fallback if Supabase is not configured
  let inMemoryMap: any = {
    width: 200,
    height: 200,
    tiles: Array(200 * 200).fill(0) // 0 = grass
  };

  // API routes
  app.get("/api/map", async (req, res) => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("maps").select("*").eq("id", "main_200").single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
        if (data) {
          return res.json(data.map_data);
        }
      } catch (err: any) {
        console.warn("Supabase warning (fetching map):", err.message || err);
      }
    }
    res.json(inMemoryMap);
  });

  app.post("/api/map", async (req, res) => {
    const mapData = req.body;
    if (supabase) {
      try {
        const { error } = await supabase.from("maps").upsert({ id: "main_200", map_data: mapData });
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase warning (saving map):", err.message || err);
      }
    }
    
    // Always update in-memory map as fallback
    inMemoryMap = mapData;
    
    // Broadcast map update to all clients
    io.emit("map_updated", mapData);
    res.json({ success: true });
  });

  // Real-time multiplayer with Socket.io
  const players: Record<string, { x: number, y: number, id: string, anim?: string, frame?: number }> = {};

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);
    
    // Initialize player
    players[socket.id] = { x: 100, y: 100, id: socket.id, frame: 1 };
    
    // Send current players to the new player
    socket.emit("current_players", players);
    
    // Broadcast new player to others
    socket.broadcast.emit("player_joined", players[socket.id]);

    socket.on("player_moved", (movementData: { x: number, y: number, anim?: string, frame?: number }) => {
      if (players[socket.id]) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].anim = movementData.anim;
        players[socket.id].frame = movementData.frame;
        // Broadcast movement to other players
        socket.broadcast.emit("player_moved", players[socket.id]);
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
      delete players[socket.id];
      io.emit("player_left", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
