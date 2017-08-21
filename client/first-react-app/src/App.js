import React, { Component } from 'react';
import './App.css';
import idle_url from './images/cat_idle.png';
import cry_url from './images/cat_cry.png';

// ----------------------------------------------
// Websockets
// ----------------------------------------------

const io = require('socket.io-client');
const socket = io();

// sockets
let userName = "unknown";
let chat = undefined;
let offline = false;

const loginUIChange = () => {
  // remove login menu
  const connect = document.querySelector("#connect");
  connect.parentNode.parentNode.removeChild(connect.parentNode);
  // show chat
  setChatVisibility(true);
}

const setChatVisibility = (vis) => {
  if (vis) {
    canvas.style.display = "block";
    document.querySelector(".sendMessageBar").style.display="block";
  } else {
    canvas.style.display = "none";
    document.querySelector(".sendMessageBar").style.display="none";
  }
}

const checkForAnim = (str,own) => {
  const cat = own ? cat1 : cat2;
  let keywordFound = true;
  switch(str) {
    case '*blink*':
      cat.anim = Object.assign(new Anim(), idle);
      break;
    case '*cry*':
      cat.anim = Object.assign(new Anim(), cry);
      break;
    default:
      keywordFound = false;
      break;
  }
  return keywordFound;
}

const connectSocket = (e) => {
  const messageInput = document.querySelector("#message");
  //chat = document.querySelector("#chat");
  
  const socket = io.connect();
  
  if (!socket) alert("io not found");

  socket.on('connect', () => {
    console.log('connecting');

    let user = document.querySelector("#username").value;

    if(!user) {
      user = 'unknown';
    }

    socket.emit('join', { name: user });
    userName = user;
    
    // change from login to chat
    loginUIChange();
  });
  
  socket.on('connect_error', () => {
    // enter offline mode (debugging only)
    console.log("offline");
    socket.disconnect();
    offline = true;
    // set user name
    let user = document.querySelector("#username").value;
    // change from login to chat
    loginUIChange();
    // display message
    output('Error', 'connection failed. You are offline. ');
  });

  socket.on('msg', (data) => {
    output(data.name, data.msg);
  });

  // send message from the input element called message
  const sendMsgFromInput = () => {
    if (offline) {
      output(userName,messageInput.value);
      messageInput.value = "";
      return;
    }

    // don't send emtpy message
    if (messageInput.value === "") return;
    // send message with user name
    const response = {
      name: userName,
      msg: messageInput.value,
    };
    socket.emit('msgToServer', response);
    messageInput.value = "";
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
  if (checkForAnim(msg,(sourceName === userName))) {
    // checkForAnim handles animation
  } else {
    const m = { own: (sourceName === userName), text: msg };
    chat.setState({messages: chat.state.messages.concat([m])});
  }
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
  setChatVisibility(false);
  console.log(chat);
};

window.onload = init;


// ----------------------------------------------
// Cavas
// ----------------------------------------------
let canvas = undefined;
let ctx = undefined;
const catImage = new Image();
catImage.src = idle_url;
const cryImage = new Image();
cryImage.src = cry_url;
let prevTime = Date.now();

class Anim {
  constructor() {
    this.startFrame = 0;
    this.frames = [0];
    this.animFPS = 30;
    this.frameNum = 0;
    this.progress = 0;
    this.loopToFrameNum = -1;
    this.srcImg = catImage;
    this.spriteSheetWidth = 2;
  }
}

// Animations
// do not reference directly, use Object.assign to create a copy (new Anim(), animToCopy);
const noAnim = new Anim();
const idle = new Anim();
idle.frames = [0,1,2,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
idle.loopToFrameNum = 0;
const cry = new Anim();
cry.srcImg = cryImage;
cry.spriteSheetWidth = 3;
cry.frames = [0,1,2,3,4];
cry.loopToFrameNum = 3;

class Cat {
  constructor() {
    this.anim = Object.assign(new Anim,idle);
    this.frameWidth = 600;
    this.width = 300;
    this.x = 500;
    this.y = 120;
    this.flipped = false;
  }
  
  update(dt) {
    // update animation
    this.anim.progress += dt;
    if (this.anim.loopToFrameNum >= 0 || this.anim.frameNum < this.anim.frames.length-1) {
      const frameTime = 1000/this.anim.animFPS;
      if (this.anim.progress > frameTime) {
        const reduction = (frameTime * Math.floor(this.anim.progress / frameTime));
        this.anim.progress -= reduction;
        this.anim.frameNum = (this.anim.frameNum + 1);  
        if (this.anim.frameNum >= this.anim.frames.length) {
          this.anim.frameNum = this.anim.loopToFrameNum;
        }
      }
    }
  }
  
  draw() {
    const w = this.frameWidth;
    const frame = (this.anim.frames[this.anim.frameNum] + this.anim.startFrame);
    const sx = w * (frame % this.anim.spriteSheetWidth);
    const sy = w * Math.floor(frame / this.anim.spriteSheetWidth);
    const dWidth = this.width;
    const dHeight = dWidth;
    const dx = - this.width/2;
    const dy = - this.width/2;
    ctx.save();
    ctx.translate(this.x,this.y);
    if (this.flipped) {
      ctx.scale(-1,1);  
    }
    ctx.drawImage(this.anim.srcImg, sx, sy, w, w, dx, dy, dWidth, dHeight);
    ctx.restore();
  }
}

const cat1 = new Cat();
const cat2 = new Cat();
cat2.x = 100;
cat2.flipped = true;
cat2.anim.frameNum = Math.floor(Math.random() * 17);

const draw = () => {
  const dt = Date.now() - prevTime;
  prevTime = Date.now();
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw cat 1
  cat1.update(dt);
  cat1.draw();
  
  cat2.update(dt);
  cat2.draw();
  window.requestAnimationFrame(draw);
}


// ----------------------------------------------
// React
// ----------------------------------------------

function Message(props) {
  if (props.own) {
    return (
      <div className="message own">{props.text}</div>
    )
  }
  else {
    return (
      <div className="message">{props.text}</div>
    )
  }
}

class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = { messages: [] }
  }
  render() {
    const messages = [];
    this.state.messages.map((msg) => {
      if (msg.own) {
        messages.push(<Message own text={msg.text}/>);
      } else {
        messages.push(<Message text={msg.text}/>);
      }
    })
    return (  
      <div id="chat">
      {
        messages
      }
      </div>
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
        <Chat 
          // assign the chat variable
          ref={(c) => { chat = c; }}
        />
      </div>
    );
  }
}

export default App;