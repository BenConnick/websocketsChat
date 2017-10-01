// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// requirements
const path          = require('path');
const mongo         = require('mongodb').MongoClient;
const apn           = require('apn');
const express       = require('express');
const webSocketServer = require('websocket').server;
const http            = require('http');

// apple push notifications
const apnOptions = {
  token: {
    key: __dirname + "/AuthKey_NP9Y796BS7.p8",
    keyId: "NP9Y796BS7",
    teamId: "RV7QUM6JRJ"
  },
  production: false
};
const apnProvider = new apn.Provider(apnOptions);

// database 
const url2 = "mongodb://BenConnick:$4Mango@grainofsanddb-shard-00-00-hnyhc.mongodb.net:27017,grainofsanddb-shard-00-01-hnyhc.mongodb.net:27017,grainofsanddb-shard-00-02-hnyhc.mongodb.net:27017/GrainOfSandDB?ssl=true&replicaSet=GrainOfSandDB-shard-0&authSource=admin";
mongo.connect(url2, function(err, db) {
  if (err != null) throw("error! " + err);
  console.log("Successfully connected to database.");
  db.close();
});

// static file serving
const app = express();
app.use(express.static(__dirname + '/build'));

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = process.env.PORT || 1337;

/**
 * Global variables
 */
// latest 100 messages
var history = {};
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
    /*if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
    }*/

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
                
                // get user history
                retrieveUserHistory(userName);
                
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
                //history[userName].push(obj);
                //history[userName] = history[userName].slice(-100);
                
                // broadcast message to sender and recipient
                var json = JSON.stringify({ type:'message', data: obj });
                for (var i=0; i < clients.length; i++) {
                    if (userNames[i] == obj.author || userNames[i] == obj.recipient) {
                        clients[i].sendUTF(json);
                    }
                }
                
                // send apple push notification
                const deviceToken = "3e1785662e7168b17f60df1739bb28bcce3fdb10ef64a10f81b4a0e49af4be79";
                let note = new apn.Notification();
                note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                note.badge = 1;
                note.sound = "ping.aiff";
                note.alert = "You have a new message";
                note.payload = {'messageFrom': 'John Appleseed'};
                note.topic = "com.expmaker.meowssenger";
                apnProvider.send(note, deviceToken).then( (result) => {
                  // see documentation for an explanation of result
                  console.log("push notification result:");
                  console.log(result);
                  console.log(result.failed);
                  console.log(result.failed[2]);
                  console.log(Object.keys(result));
                });
                
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

// database stuff
// **********************

// delete the entire database!!!
const removeAll = (db, callback) => {
   db.collection('saves').deleteMany(
      {},
      function(err, results) {
         console.log(results);
         callback();
      }
   );
};


// retrieve the user history
const retrieveUserHistory = (user) => {
  mongo.connect(url2, function(err, db) {
    // throw error
    if (err != null) throw("error! " + err);
    // ask the database for the history of a specific user
    db.collection('history').find({'name': user}).then((result) => { 
      userHistoryRecieved(result); 
      db.close(); 
    });
  });
}

// user history recieved
const userHistoryRecieved = (result) => {
  console.log(result);
  console.log(result.messages);
}

/*
// create a new save entry
const insertSave = (db, callback) => {
   db.collection('saves').insertOne( rt, function(err, result) {
    assert.equal(err, null);
    //console.log("Inserted a document into the saves collection.");
    callback();
  });
};

// read the save entry
const findSave = (db, callback) => {
   var cursor =db.collection('saves').find( );
   cursor.each(function(err, doc) {
      console.log("" + cursor.cursorState.documents.length + " db entries found");
      assert.equal(err, null);
      if (doc != null) {
         //console.dir(doc);
         callback(doc);
      } else {
         callback();
      }
   });
};

// update a save entry?
const updateSave = (db, callback) => {
   db.collection('saves').replaceOne(
      {}, rt, 
      function(err, results) {
        //console.log(results);
        callback();
   });
};
*/