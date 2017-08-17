import React, { Component } from 'react';
import './App.css';
import catImgUrl from './images/cat_idle.png';

// ----------------------------------------------
// Websockets
// ----------------------------------------------

const io = require('socket.io-client');
const socket = io();

// sockets
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
    connect.parentNode.parentNode.removeChild(connect.parentNode);
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
    if (message.value === "") return;
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
    default:
      break;
  }
});
};

const output = (sourceName, msg) => {
  chat.innerHTML = '' + chat.innerHTML + '<p>' + sourceName + ': ' + msg + '</p>';
};


// ----------------------------------------------
// Initalization
// ----------------------------------------------
const init = () => {
  const connect = document.querySelector("#connect");
  connect.addEventListener('click',connectSocket);
  canvas = document.querySelector("canvas");
  ctx = canvas.getContext("2d");
  window.requestAnimationFrame(draw);
};

window.onload = init;


// ----------------------------------------------
// Cavas
// ----------------------------------------------
let canvas = undefined;
let ctx = undefined;
const catImage = new Image();
catImage.src = catImgUrl;
let prevTime = Date.now();

class Anim {
  constructor() {
    this.startFrame = 0;
    this.frames = [0,1,2,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    this.animFPS = 12;
    this.frameNum = 0;
    this.progress = 0;
  }
}

const idleRight = new Anim();

class Cat {
  constructor() {
    this.anim = idleRight;
    this.frameWidth = 1000;
    this.width = 500;
    this.x = 400;
    this.y = 160;
  }
}

const cat1 = new Cat();

const drawCat = (cat,dt) => {
  cat.anim.progress += dt;
  if (cat.anim.progress > 1000/cat.anim.animFPS) {
    cat.anim.progress -= 1000/cat.anim.animFPS;
    cat.anim.frameNum = (cat.anim.frameNum + 1) % cat.anim.frames.length;  
  }
  const w = cat.frameWidth;
  const sx = w * (cat.anim.frames[cat.anim.frameNum] + cat.anim.startFrame);
  const sy = 0;
  const dWidth = cat.width;
  const dHeight = dWidth;
  const dx = cat.x - cat.width/2;
  const dy = cat.y - cat.width/2;
  ctx.drawImage(catImage, sx, sy, w, w, dx, dy, cat.width,cat.width);

  //ctx.drawImage(catImage,0,0,1000,1000,0,0,100,100);
}

const draw = () => {
  const dt = Date.now() - prevTime;
  prevTime = Date.now();
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw cat 1
  drawCat(cat1,dt);
  window.requestAnimationFrame(draw);
}


// ----------------------------------------------
// React
// ----------------------------------------------

class Message extends Component {
  render() {
  return (
    <div className="message">this.props.text</div>
    )
  }
}

class Chat extends Component {
  render() {
    return (
      this.props.messages
    )
  }
}

class Cats extends Component {
  render() {
    return (
      <canvas width='600' height='200'></canvas>
    )
  }
}

class Login extends Component {
  render() {
    return (
      <div className="login">
        <label htmlFor="user">Name:</label>
        <input id="username" name="user" type="text"/>
        <div id="connect">join</div>
      </div>
    )
  }
}

class App extends Component {
  render() {
    console.log(socket);
    return (
      <div className="App">
        <div className="App-header">
          <div>MEOWSSENGER</div>
        </div>
        <br/>
        <Login />
        <Cats/>
        <div className="sendMessageBar">
          <div className="inputSpacer"></div>
          <input className="messageInput" id="message" name="message" type="text"/>
          <div id="send">send</div>
        </div>
  
        <div id="chat"></div>
      </div>
    );
  }
}

export default App;