import React, { Component } from 'react';
import './App.css';

class App extends Component {
  render() {
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
  
        <textarea id="chat" rows="20" cols="40" readOnly></textarea>
  
        <div className="anim"></div>
      </div>
    );
  }
}

export default App;