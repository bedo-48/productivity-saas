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

// Run DB migrations then start server
runMigrations().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
