const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

//const htmlHandler = require('./htmlResponses.js');
//const mediaHandler = require('./mediaResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port, "0.0.0.0");

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server
const io = socketio(app);

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
		// serverside commands
		if (data.msg.length > 0 && data.msg[0] == "/") {
			if (data.msg.length > 1) {
				switch(data.msg[1]) {
					// roll
					case "r":
						if (data.msg.length > 3) {
							let r = roll(socket.name, data.msg.substring(3));
							if (r == undefined) {
								socket.emit('msg', { name: 'server', msg: "Invalid die type. Valid die types are d4, d6, d8, d10, d12, and d20" });
								return;
							} else {
								io.sockets.in('room1').emit('msg', { name: 'server', msg: r});
								return;
							}
						}
						break;
					// me
					case "m":
						if (data.msg.length > 3) {
							if (data.msg.substring(2,4) == "e ") {
								io.sockets.in('room1').emit('msg', { name: "server", msg: `${socket.name} ${data.msg.substring(4)}`});
								return;
							}
						}
						break;
					// time
					case "t":
						if (data.msg.indexOf("/time") > -1) {
							const d = new Date();
							socket.emit('msg', { name: 'server', msg: `Current time is ${d.toTimeString()}`});
							return;
						}
						break;
					default:
						break;
				}
				
			}
			
			// if we arrived here, no command was valid.
			socket.emit('msg', { name: socket.name, msg: 'Command '+data.msg.substring(1)+' not understood. Valid commands are "/rd[die number of sides]", "/me [your action]", "/time"' });
			return;
		}
		
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