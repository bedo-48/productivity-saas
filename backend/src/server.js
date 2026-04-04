import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket.js";
import { runMigrations } from "./config/migrate.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Init Socket.IO
const io = initSocket(server);
app.set("io", io);

// Start server immediately, run migrations in background with delay
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Wait 3s for DB to be ready, then migrate
setTimeout(() => runMigrations(), 3000);
