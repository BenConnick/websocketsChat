import React, { Component } from 'react';
import './App.css';
import spritesheet_url from './images/cat_idle+cry.png';
import love_url from './images/cat_love.png';

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
    case '*love*':
      cat.anim = Object.assign(new Anim(), love);
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
    userName = document.querySelector("#username").value;
    // change from login to chat
    loginUIChange();
    // display message
    output('Error', 'Connection failed. You are offline. ');
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
catImage.src = spritesheet_url;
const loveImage = new Image();
loveImage.src = love_url;
let prevTime = Date.now();

class Anim {
  constructor(frames) {
    this.startFrame = 0;
    this.frames = frames;
    this.animFPS = 12;
    this.frameNum = 0;
    this.progress = 0;
    this.loopToFrameNum = -1;
    this.srcImg = catImage;
    this.spriteSheetWidth = 3;
  }
}

// Animations
// do not reference directly, use Object.assign to create a copy (new Anim(), animToCopy);
const idle = new Anim([0,1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
idle.startFrame = 5;
idle.loopToFrameNum = 0;
const cry = new Anim([0,1,2,3,3,4,4]);
cry.loopToFrameNum = 3;
const love = new Anim([0,1,2,2,3,3]);
love.srcImg = loveImage;
love.loopToFrameNum = 2;
love.spriteSheetWidth = 2;

class Cat {
  constructor() {
    this.anim = Object.assign(new Anim(),idle);
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
cat2.anim.frameNum = Math.floor(Math.random() * 15) + 10;

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
  let className = props.own ? "message own" : "message";
  let parentClassName = props.own ? "messageContainer own" : "messageContainer";

  return (
    <div className={parentClassName}><div className={className}><span>{props.text}</span></div></div>
  );
}

class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = { messages: [] }
  }
  componentDidUpdate (prevProps, prevState) {
    // innefficient, need to find better way
    document.querySelector("#chat").scrollTop = 100000000;
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
      <canvas className="cats" width='600' height='200'></canvas>
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