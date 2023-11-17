const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const os = require('os');
const cluster = require('cluster');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }

  return setupPrimary();
}

async function main() {
  const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}, // Check if this is needed for your use case
    adapter: createAdapter(),
  });

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', (socket) => {
    // socket.emit('recovery');

    socket.on('chat message', async (msg) => {
      // Process the message if needed

      // Send the original message back to the sender
      // io.to(socket.id).emit('chat message', msg);

      // await db.run('INSERT INTO messages (client_offset, content) VALUES (?, ?)', [
      //   clientOffset,
      //   msg,
      // ]);

      io.emit('chat message', msg);
    });

    // socket.on('recovery', async () => {
    //   if (!socket.recovered) {
    //     try {
    //       await db.each(
    //         'SELECT id, content FROM messages WHERE id > ?',
    //         [socket.handshake.auth.serverOffset || 0],
    //         (_err, row) => {
    //           socket.emit('chat message', row.content, row.id);
    //         }
    //       );
    //     } catch (e) {
    //       console.error(e);
    //     }
    //     socket.recovered = true;
    //   }
    // });
  });

  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
  });
}

main();
