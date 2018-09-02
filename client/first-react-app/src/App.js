import React, { Component } from 'react';
import './App.css';
import spritesheet_url from './images/cat_idle+cry.png';
import love_url from './images/cat_love.png';
import sleep_url from './images/cat_sleep.png';
import love_t from './images/thumbnails/love.png';
import blink_t from './images/thumbnails/blink.png';
import cry_t from './images/thumbnails/cry.png';
import sleep_t from './images/thumbnails/sleep.png';

// ----------------------------------------------
// Websockets
// ----------------------------------------------

// if user is running mozilla then use it's built-in WebSocket
window.WebSocket = window.WebSocket || window.MozWebSocket;

// if browser doesn't support WebSocket, just show some notification and exit
if (!window.WebSocket) {
  alert("websockets not supported");
}
// sockets
let connection; // the socket
let userName = "unknown";
let partnerName = "";
let chat = undefined;
let offline = false;

// send message function
let sendMessage;

const loginUIChange = () => {
  // remove login menu
  const connect = document.querySelector("#connect");
  connect.parentNode.parentNode.removeChild(connect.parentNode);
  // show name in header
  const header = document.querySelector(".App-header > div");
  header.innerHTML = partnerName;
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
      cat.anim = Object.assign(new Anim(), anims.blink);
      break;
    case '*cry*':
      cat.anim = Object.assign(new Anim(), anims.cry);
      break;
    case '*love*':
      cat.anim = Object.assign(new Anim(), anims.love);
      break;
    case '*sleep*':
      cat.anim = Object.assign(new Anim(), anims.sleep);
      break;
    default:
      keywordFound = false;
      break;
  }
  return keywordFound;
}

const connectSocket = () => {


  const messageInput = document.querySelector("#message");
  //chat = document.querySelector("#chat");

  // open connection
  connection = new WebSocket('ws://meowssenger.herokuapp.com');

  if (!connection) alert("uh oh, there's a problem");

  connection.onopen = function () {
      console.log('connecting');

      let user = document.querySelector("#username").value;
      let partner = document.querySelector("#partnerName").value;

      if(!user) {
        user = 'unknown';
      }

	  // the first message establishes the identity of the connected client
	  let firstMessage = {"name": user, "partner": partner};

	  let deviceToken = undefined;
	  if (window.Android && window.Android.getIDFromAndroid) {
		  deviceToken = window.Android.getIDFromAndroid();
		  if (deviceToken) {
			     firstMessage = {"name": user, "partner": partner, "deviceToken": deviceToken};
		  }
	  } else {
		  console.log("failed to get device token");
	  }

      //socket.emit('join', { name: user });
      connection.send(JSON.stringify(firstMessage));
      userName = user;
      partnerName = partner;

      setCookie('userName',user);
      setCookie('partnerName',partner);

      // change from login to chat
      loginUIChange();
  };

  connection.onerror = function (error) {
    // enter offline mode (debugging only)
    console.log("offline");
    //socket.disconnect();
    offline = true;
    // set user name
    userName = document.querySelector("#username").value;
    // set partner name

    // change from login to chat
    loginUIChange();
    // display message
    output('Error', 'Connection failed. You are offline. ' + error);
  };

  connection.onmessage = function (message) {
    let json = "";
    try {
        json = JSON.parse(message.data);
    } catch (e) {
        console.log('This doesn\'t look like a valid JSON: ', message.data);
        return;
    }
    console.log(json);
    if (json.type === "history") {
      console.log("history recieved");
      const histArray = json.data[0].messages;
      for (let i=0; i<histArray.length; i++) {
        const obj = JSON.parse(histArray[i]);
        output(obj.data.author, obj.data.text);
      }
    } else {
      output(json.data.author, json.data.text);
    }
  }

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
    /*const response = {
      name: userName,
      msg: messageInput.value,
    };*/
    connection.send('{"recipient":"'+partnerName+'","text":"'+messageInput.value+'"}');
    messageInput.value = "";
  }

  sendMessage = (msg) => {
    messageInput.value = msg;
    sendMsgFromInput();
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
  // handle animaiton
  checkForAnim(msg,(sourceName === userName));
  const m = { own: (sourceName === userName), text: msg };
  chat.setState({messages: chat.state.messages.concat([m])});
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

  // auto login
  const name = getCookie('userName');
  const partner = getCookie('partnerName');
  if (name && name !== "" && partner && partner !== "") {
    document.querySelector("#username").value = name;
    document.querySelector("#partnerName").value = partner;
    connectSocket();
  }
};

window.onload = init;

// ----------------------------------------------
// Utility
// ----------------------------------------------
const setCookie = (cname, cvalue) => {
    const expires = 'expires=Thu, 18 Dec 2022 12:00:00 UTC';
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

const getCookie = (cname) => {
    const name = cname + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}


// ----------------------------------------------
// Cavas
// ----------------------------------------------

const animationNames = ["blink","cry","love","sleep"];
const anims = {
  blink: null,
  cry: null,
  love: null,
  sleep: null,
}
// thumbnail image links
const thumbnails = [blink_t, cry_t, love_t, sleep_t];
let canvas = undefined;
let ctx = undefined;
const catImage = new Image();
catImage.src = spritesheet_url;
const loveImage = new Image();
loveImage.src = love_url;
const sleepImage = new Image();
sleepImage.src = sleep_url;
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
anims.blink = new Anim([0,1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
anims.blink.startFrame = 5;
anims.blink.loopToFrameNum = 0;
anims.cry = new Anim([0,1,2,3,3,4,4]);
anims.cry.loopToFrameNum = 3;
anims.love = new Anim([0,1,2,2,3,3]);
anims.love.srcImg = loveImage;
anims.love.loopToFrameNum = 2;
anims.love.spriteSheetWidth = 2;
anims.sleep = new Anim([0,0,1,1,2,2,2,2,3,3,3,3]);
anims.sleep.loopToFrameNum = 4;
anims.sleep.spriteSheetWidth = 2;
anims.sleep.srcImg = sleepImage;

class Cat {
  constructor() {
    this.anim = Object.assign(new Anim(),anims.blink);
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
  let className = "message" + (props.own ? " own" : "");
  let parentClassName = props.own ? "messageContainer own" : "messageContainer";

  return (
    <div className={parentClassName}><div className={className}><span>{props.text}</span></div></div>
  );
}

class StickerModeButton extends Component{
  render() {
    return(
      <div className="stickerModeBtn" onClick={this.props.onClick}>😀</div>
    );
  }
}

class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = { messages: [] }
  }
  componentDidUpdate (prevProps, prevState) {
    document.querySelector("#chat").scrollTop = 100000000;
  }
  render() {
    const messages = [];
    let count = 0;
    this.state.messages.map((msg) => {
      if (msg.own) {
        messages.push(<Message key={count} own text={msg.text}/>);
      } else {
        messages.push(<Message key={count} text={msg.text}/>);
      }
      count++;
    })
    return (
      <div id="chat" className={this.props.className}>
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
      <canvas className={this.props.className} width='600' height='200'></canvas>
    )
  }
}

class StickerButton extends Component {
  render() {
    return (
      <div className="stickerBtn"
        style={{
          backgroundImage: "url("+this.props.url+")"
        }}
        onClick={() => {
          sendMessage("*"+this.props.anim+"*");
          this.props.toggleMenu();
        }}>
      </div>
    )
  }
}

class StickerMenu extends Component {
  render() {
    return (
      <div className={this.props.className}>
        {this.props.stickerButtons}
      </div>
    )
  }
}

class Login extends Component {
  render() {
    return (
      <div className="login">
        <label htmlFor="user">Name:</label>
        <input id="username" name="user" type="text"/>
        <label htmlFor="partner">Partner:</label>
        <input id="partnerName" name="partner" type="text"/>
        <div id="connect">join</div>
      </div>
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    const numbers = [0,1,2,3];
    const listItems = numbers.map((number) => {
      return <StickerButton
        key={number}
        anim={animationNames[number]}
        url={thumbnails[number]}
        toggleMenu={() => {this.toggleStickerMenu();}}
        />
      }
    );
    this.state = {
      catsClass: "cats",
      msgBarClass: "sendMessageBar",
      chatClass: "",
      showStickers: false,
      stickerButtons: listItems,
    };

  }
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <div>MEOWSSENGER</div>
        </div>
        <Login />
        <Cats className={this.state.catsClass} />
        <div className={this.state.msgBarClass}>
          <StickerMenu className="stickerMenu" stickerButtons={this.state.stickerButtons}/>
          <input className="messageInput" id="message" name="message" type="text"/>
          <StickerModeButton onClick={() => {this.toggleStickerMenu();}}/>
          <div id="send">send</div>
        </div>
        <Chat
          // assign the chat variable
          ref={(c) => { chat = c; }}
          className={this.state.chatClass}
        />
        <div id="fade"></div>
      </div>
    );
  }
  toggleStickerMenu() {
    this.setState((prevState, props) => {
      return {
        showStickers: !prevState.showStickers,
        msgBarClass: prevState.showStickers ? "sendMessageBar" : "sendMessageBar raised",
        catsClass: prevState.showStickers ? "cats" : "cats raised",
        chatClass: prevState.showStickers ? "" : "raised",
      };
    });
  }
}

export default App;
