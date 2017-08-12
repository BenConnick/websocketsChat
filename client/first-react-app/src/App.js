import React, { Component } from 'react';
import './App.css';

const io = require('socket.io-client');
const socket = io();

let userName = "unknown";
let chat = undefined;
const connectSocket = (e) => {
  const message = document.querySelector("#message");
  chat = document.querySelector("#chat");
  const socket = io.connect();

  socket.on('connect', () => {
    console.log('connecting');

    let user = document.querySelector("#username").value;

    if(!user) {
      user = 'unknown';
    }

    socket.emit('join', { name: user });
    userName = user;

    // remove button
    const connect = document.querySelector("#connect");
    connect.parentNode.removeChild(connect);
  });

  socket.on('msg', (data) => {
    console.log(data);
    switch(data.msg) {
      case 'cat':
      output(data.name, "<div class='anim'></div>");
      break;
      default:
      output(data.name, data.msg);
      break;
    }
  });

  // send message from the input element called message
  const sendMsgFromInput = () => {
    // don't send emtpy message
    if (message.value == "") return;
    // send message with user name
    const response = {
    name: userName,
    msg: message.value,
  };
  socket.emit('msgToServer', response);
  message.value = "";
}

  // hook up send button
  const send = document.querySelector("#send");
  send.addEventListener('click',sendMsgFromInput);

// send with enter key
window.addEventListener("keydown", (e) => {
  switch(e.keyCode) {
    case 13:
      sendMsgFromInput();
      break;
  }
});
};

const output = (sourceName, msg) => {
  chat.innerHTML = '' + chat.innerHTML + '<p>' + sourceName + ': ' + msg + '</p>';
};

const init = () => {
  const connect = document.querySelector("#connect");
  connect.addEventListener('click',connectSocket);
};

window.onload = init;

class App extends Component {
  render() {
    console.log(socket);
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to Meowssenger</h2>
        </div>
        <br/>
        <label htmlFor="user">Username:</label>
        <input id="username" name="user" type="text"/>
        <input id="connect" type='button' value='connect'/>
        <br/>
        <label htmlFor="message">Message:</label>
        <input id="message" name="message" type="text"/>
        <input id="send" type="button" value="send" />
  
        <div id="chat"></div>
        
  
        <div className="anim"></div>
      </div>
    );
  }
}

export default App;