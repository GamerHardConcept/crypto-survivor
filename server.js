const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
// Attachez Socket.IO au serveur HTTP
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Stockage en mémoire pour les utilisateurs
const users = [];
const connectedUsers = []; // Garde la trace des utilisateurs connectés
const saltRounds = 10;

// Servez les fichiers statiques (images, css, etc.)
app.use(express.static(__dirname));

// Servez le fichier HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Code Valie v30 grosse mise à jour v1.html'));
});

// Logique de connexion Socket.IO
console.log('Configuration des événements Socket.IO...');
io.on('connection', (socket) => {
  console.log('SUCCÈS : Un utilisateur est bien connecté au serveur via Socket.IO. ID:', socket.id);

  socket.on('register', async (data) => {
    const { username, password } = data;
    if (users.find(user => user.username === username)) {
      return socket.emit('register-error', 'Ce pseudo est déjà utilisé.');
    }
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      users.push({ id: socket.id, username, password: hashedPassword });
      console.log('Nouvel utilisateur inscrit:', username);
      socket.emit('register-success', { username });
    } catch (error) {
      console.error("Erreur lors du hachage du mot de passe:", error);
      socket.emit('register-error', 'Une erreur est survenue sur le serveur.');
    }
  });

  socket.on('login', async (data) => {
    const { username, password } = data;
    const user = users.find(u => u.username === username);
    if (!user) {
      return socket.emit('login-error', 'Pseudo ou mot de passe incorrect.');
    }
    try {
      // Vérifier si l'utilisateur est déjà connecté
      if (connectedUsers.find(u => u.username === username)) {
        return socket.emit('login-error', 'Ce pseudo est déjà connecté.');
      }

      const match = await bcrypt.compare(password, user.password);
      if (match) {
        // Ajouter l'utilisateur à la liste des connectés
        connectedUsers.push({ id: socket.id, username });
        console.log('Utilisateur connecté:', username, 'avec ID:', socket.id);
        socket.emit('login-success', { username });
      } else {
        socket.emit('login-error', 'Pseudo ou mot de passe incorrect.');
      }
    } catch (error) {
      console.error("Erreur lors de la comparaison du mot de passe:", error);
      socket.emit('login-error', 'Une erreur est survenue sur le serveur.');
    }
  });

  socket.on('disconnect', () => {
    const index = connectedUsers.findIndex(user => user.id === socket.id);
    if (index !== -1) {
      const disconnectedUser = connectedUsers.splice(index, 1);
      console.log('Utilisateur déconnecté:', disconnectedUser[0].username);
    } else {
      console.log('Un utilisateur non identifié s\'est déconnecté:', socket.id);
    }
  });
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Le serveur est en écoute sur le port ${PORT}`);
});
