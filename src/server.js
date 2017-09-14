const express = require('express');

const app = express();
app.use(express.static('src/build'));
const http = require('http').Server(app);
const socketio = require('socket.io');
// const url = require('url');
const path = require('path');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// start server listen to all IPs on port
http.listen(port, '0.0.0.0', 511, () => {
  console.log(`listening on *: ${port}`);
  // console.log(`Listening on 127.0.0.1: ${port}`);
});

// FILE SERVING HANDLED BY EXPRESS

// returns homepage
app.get('/', (req, res) => {
  // does not run, just returns index
  console.log('root request recieved');
  res.sendFile(path.resolve('src/build/index.html'));
});

// pass in the http server into socketio and grab the websocket server
const io = socketio(http);

// object to hold all of our connected users
const users = {};

const onJoined = (sock) => {
	const socket = sock;
	
	socket.on('join', (data) => {
		// message back
		const joinMsg = {
			name: 'server',
			msg: `There are ${Object.keys(users).length} users online`,
		};
		
		if (users[socket.name] == undefined) {
			socket.name = data.name;
			socket.emit('msg', joinMsg);
		
			socket.join('room1');
	
			users[socket.name] = socket;
	
			//announcement to everyone in the room
			const response = {
				name: 'server',
				msg: `${data.name} has joined the room.`,
			};
			socket.broadcast.to('room1').emit('msg',response);
	
			console.log(`${data.name} joined`);
			//success message back to new user
			socket.emit('msg', { name: 'server', msg: 'You joined the room' });
		} else {
			// failure message to the user
			socket.emit('msg', { name: 'server', msg: 'Another user already has that name' });
		}
	});
};

const roll = (name, die) => {
	console.log(`${name} wants to roll a d${die}`);
	let response = "";
	switch(die) {
		case "4":
		case "6":
		case "8":
		case "10":
		case "12":
		case "20":
			return `${name} rolled a d${die} and got a ${Math.floor(Math.random()*die)}`;
			break;
		default:
			return undefined;
			break;
	}
}

const onMsg = (sock) => {
	const socket = sock;
	
	socket.on('msgToServer', (data) => {
		io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
	});
}

const onDisconnect = (sock) => {
	const socket = sock;
	socket.on('disconnect', (data) => {
		// message for remaining users
		const leaveMsg = {
			name: 'server',
			msg: `${socket.name} left the room. There are ${Object.keys(users).length - 1} users online`,
		};
		
		delete users[socket.name]; // clear user from list
		
		socket.broadcast.to('room1').emit('msg',leaveMsg);
		
		console.log(`${socket.name} left`);
	});
}

io.sockets.on('connection', (socket) => {
	console.log('started');
	
	onJoined(socket);
	onMsg(socket);
	onDisconnect(socket);
});

console.log("websocket server started");