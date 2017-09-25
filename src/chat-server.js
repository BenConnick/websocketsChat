// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// path reading
const path = require('path');

// static file serving
const express = require('express');
const app = express();
app.use(express.static(__dirname + '/build'));

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = process.env.PORT || 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// latest 100 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];
// list of client names
var userNames = [ ];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP server
 */

var server = app.listen(webSocketsServerPort);
/*var server = http.createServer(function(request, response) {
    // TODO: serve static web page
    //response.sendFile(path.resolve('src/build/index.html'));
});*/
console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
/*server.listen(webSocketsServerPort, function() {
    //console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});*/

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    // accept connection
    var connection = request.accept(null, request.origin); 
    // store client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = undefined;

    console.log((new Date()) + ' Connection accepted from ' + request.origin);

    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
    }

    // user sent message
    connection.on('message', function(message) {
        if (message.type === 'utf8') { // accept only text
            if (userName === undefined) { // first message sent by user is their name
                // remember user name
                userName = htmlEntities(message.utf8Data);
                //connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));
                console.log((new Date()) + ' User is known as: ' + userName);
                // add to list (maybe problem with ordering...)
                userNames.push(userName);
            } else { // log and broadcast the message
                console.log((new Date()) + ' Received Message from '
                            + userName + ': ' + message.utf8Data);
                            
                // try to parse json
                var jsonObj = JSON.parse(message.utf8Data);
                // if there is no json, then the message is the text
                var text = jsonObj? jsonObj.text : message.uft8Data;
                var recipient = jsonObj? jsonObj.recipient : userName;
                
                // we want to keep history of all sent messages
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(text),
                    author: userName,
                    recipient: htmlEntities(recipient)
                };
                history.push(obj);
                history = history.slice(-100);
                
                // broadcast message to sender and recipient
                var json = JSON.stringify({ type:'message', data: obj });
                for (var i=0; i < clients.length; i++) {
                    if (userNames[i] == obj.author || userNames[i] == obj.recipient) {
                        clients[i].sendUTF(json);
                    }
                }
                
                /*
                // broadcast message to all connected clients
                var json = JSON.stringify({ type:'message', data: obj });
                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
                */
                
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
            if (userNames[index]) userNames.splice(index, 1);
        }
    });

});