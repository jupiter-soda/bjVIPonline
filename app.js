const express = require('express');
require('dotenv').config();
const port = process.env.PORT;
const app = express();
const fs = require('fs');
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const randomstring = require("randomstring");
const e = require('express');
// const io = socketio().listen(server);
const ACTION_SELECTING_WAGER = "Player 2 is selecting a wager";
const ACTION_SELECTING_CHOICE_2 = "Player 2 is making their choice";
const ACTION_SELECTING_CHOICE_1 = "Player 1 is making their choice";
const blackjacktabletemplate = '<div class="blackjackplayarea"><div class="buttonbox" id="newgame"><div class="textupdates" id="textUpdates"> Press \'New Game\' to begin! </div> <div id="wagerbox">    How much would you like to bet?<br>    $<input type="text" id="wager" maxlength="255"><br></div>   <button alt="play" id="play">New Game</button> </div> <div class="buttonbox hidden" id="buttonBox"> <button alt="hit" id="hit">Hit</button> <button alt="stay" id="stay">Stay</button> </div> <table class="gamehands"> <tr> <th id="p1hand"> Player 1\'s  Hand </th> <th id="p2hand"> Player 2\'s Hand </th> </tr> <tr> <td><div id="p1cards" class="playercards">No cards dealt yet</div></td> <td><div id="p2cards" class="playercards">No cards dealt yet</div></td> </tr> </table> <div id="tracker" class="buttonbox"> <p>Wins: 0 Draws: 0 Losses: 0</p> </div> <div class="buttonbox"> <p><span class="bold" >Status: </span></p> <span id="status" class="bold redcard"></span> <!--<br /> <br /> <img src="img/stratchart.png" />--></div><div id="chat"><button data-count="" onclick="loadchatpopup(this)">Chat</button></div></div>'; 
const emptyeventtemplate = {slideimgpath:"",maxcount:'1',cost:'0'};
const emptyassistanttemplate = {currentevent:''};
app.use(express.static('public'));
app.get('/', (request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile('./index.html', null, function (error, data) {
        if (error) {
            response.writeHead(404);
            respone.write('Whoops! File not found!');
        } else {
            response.write(data);
        }
        response.end();
    });
});
server.listen(process.env.PORT || 3000, () => {
    console.log('listening on *:'+process.env.PORT);
    console.log(server.address());
});

app.get('/loadtemplate', function (req, res) {
    res.send(blackjacktabletemplate);
 });
 app.get( '/game.js', function (req, res){
    fs.readFile('public/game.js', function (err, data) {
        if (err) { throw err; }
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.write(data);
        res.end();
        return;
    });
});
app.get('/bjtemp.css', (req, res) => {
    res.sendFile(__dirname + '/public/css/bjtemp.css')
  });

let rooms = {};
let players={};
io.on('connection', function(socket) {
    // console.log(lib);
    console.log('A user connected');
    console.info(`Server side socket[${socket.id}] connection established.`);
    players[socket.id] = {currentevent:emptyeventtemplate,assisstant:emptyassistanttemplate,chatenabled:false};
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
      if(players.hasOwnProperty(socket.id)){
        let jsbApp = rooms.hasOwnProperty(getRoomID(socket.id)) && rooms[getRoomID(socket.id)].hasOwnProperty("jsbApp")?rooms[getRoomID(socket.id)].jsbApp:{};
        if(Object.keys(jsbApp).length>0){
          jsbApp.gameComplete = true;
          io.in(getRoomID(socket.id)).emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
        }
        io.in(getRoomID(socket.id)).emit("showmessage",{code:100, message:"Player has disconnected."});
        delete rooms[getRoomID(socket.id)];
        delete getRoomID(socket.id);
        
      }
      console.log('A user disconnected');
      // cleanupdata();
    });
    socket.on("createGame",(data)=>{
      createGame(socket, data,socket.id,false);
    });
    //Join Game Listener
    socket.on("joinGame",(data)=>{
      let roomID = data.roomID;
      let playerinfo = data.playerinfo;
      let name = data.name;
      joinGame(roomID, socket, playerinfo, name, false);
    });
    socket.on("beginGame",(data)=>{
      let wager = parseInt(data.wager);
      if(rooms.hasOwnProperty(data.roomID) ){
          let jsbApp = rooms[data.roomID].jsbApp;
          if(jsbApp.gameStatus == 0 && !jsbApp.gameComplete && (wager > 0 && wager <= jsbApp.player2money)){
              jsbApp.player1info = rooms[data.roomID].player1info;
              jsbApp.player2info = rooms[data.roomID].player2info;
              jsbApp.player1Hand = [];
              jsbApp.player2Hand = [];
              jsbApp.player1Hand.push(drawcard(jsbApp));
              cc(jsbApp,jsbApp.player1Hand);
              jsbApp.player1Hand.push(drawcard(jsbApp));
              cc(jsbApp,jsbApp.player1Hand);
              jsbApp.player2Hand.push(drawcard(jsbApp));
              cc(jsbApp,jsbApp.player2Hand);
              jsbApp.player2Hand.push(drawcard(jsbApp));
              cc(jsbApp,jsbApp.player2Hand);
              jsbApp.gameStatus=1 // player 2 turn
              jsbApp.wager = data.wager;
              jsbApp.roomID = data.roomID;
              socket.join(data.roomID);
              io.in(data.roomID).emit("beginBlackjack",{jsbApp:getjsbAppforClient(jsbApp)});
              if(handTotal(jsbApp.player2Hand)<21){
                jsbApp.status = ACTION_SELECTING_CHOICE_2
                socket.emit("player2choice",{jsbApp:getjsbAppforClient(jsbApp)});
              }else{
                jsbApp.gameStatus = 2 // player 1(dealer) turn
                jsbApp.status = ACTION_SELECTING_CHOICE_1;
                if(jsbApp.botmode){
                  botChoice(socket,jsbApp);
                }else{
                  socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
                }
                socket.emit("hidenewgame",{jsbApp:getjsbAppforClient(jsbApp)});
              }
              socket.broadcast.emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
          }else{
            if( wager > jsbApp.player2money ){
              socket.emit("showmessage",{code:100, message:"Insufficient amount of money"});
            }
          }
      }
    });
    socket.on("hitcard",(data)=>{
      let roomID = data.roomID;
      let id = socket.id;
      hitCard(socket,roomID,id);
    });
  socket.on("stayturn",(data)=>{
    stayTurn(socket,  data.roomID, socket.id);

  });
  socket.on("initplayerdata",(data)=>{
    players[socket.id].currentevent = data.currentevent;
    players[socket.id].assisstant = data.assisstant;
    players[socket.id].randomevent = data.randomevent;
    players[socket.id].chatenabled = data.chatenabled;
    players[socket.id].money = data.money;
  });
  socket.on("sendchatmessage",(data)=>{
    let jsbApp = rooms.hasOwnProperty(getRoomID(socket.id)) && rooms[getRoomID(socket.id)].hasOwnProperty("jsbApp")?rooms[getRoomID(socket.id)].jsbApp:{};    
    if(Object.keys(jsbApp).length>0){
      let player1 = socket.id == rooms[getRoomID(socket.id)].player1info.id;
      let player2 = socket.id == rooms[getRoomID(socket.id)].player2info.id;
      if(player1 || player2){
        let messageObj = {};
        messageObj.content = data.message;
        messageObj.player1 = player1;
        messageObj.playername = player1?jsbApp.player1info.name:jsbApp.player2info.name;
        messageObj.classname = player1?"player1":"player2";
        jsbApp.chat.message.push(messageObj);
        if(player1){
          jsbApp.chat.p1lastseen = jsbApp.chat.message.length;
          socket.broadcast.emit("unreadchat",{count:jsbApp.chat.message.length-jsbApp.chat.p2lastseen, chat:jsbApp.chat});
        }else{
          jsbApp.chat.p2lastseen = jsbApp.chat.message.length;
          socket.broadcast.emit("unreadchat",{count:jsbApp.chat.message.length-jsbApp.chat.p1lastseen, chat:jsbApp.chat});
        }
      }
      // socket.broadcast.emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
    }
  });
  socket.on("readchat",(data)=>{
    let jsbApp = rooms.hasOwnProperty(getRoomID(socket.id)) && rooms[getRoomID(socket.id)].hasOwnProperty("jsbApp")?rooms[getRoomID(socket.id)].jsbApp:{};    
    if(Object.keys(jsbApp).length>0){
      let player1 = socket.id == rooms[getRoomID(socket.id)].player1info.id;
      let player2 = socket.id == rooms[getRoomID(socket.id)].player2info.id;
      if(player1){
        jsbApp.chat.p1lastseen = data.count;
      }else if(player2){
        jsbApp.chat.p2lastseen = data.count;
      }
    }
  });
  socket.on("listrooms",(data)=>{
    let availablerooms = [];
    for(let i in rooms){
      let room = rooms[i];
      if(!room.private){
        availablerooms.push({playerinfo:room.player1info,roomID:i})
      }
    }
    socket.emit("availablerooms",{rooms:availablerooms});
  });
  socket.on("createbotmatch",(data)=>{
    data.botmode = true;
    let name = data.name;
    data.name = "Bot";
    data.playerinfo
    let roomID = createGame(socket, data, "dummyid",true);
    joinGame(roomID,socket,data.playerinfo,name, true);
  });
});
const hiddencardtemp =  new card("", 0, "Hidden Card", "hidden", "black");

function joinGame(roomID, socket, playerinfo, name, botmode) {
  if (rooms.hasOwnProperty(roomID) && rooms[roomID].players.length < 2) {
    var curr_players = rooms[roomID].players;
    let cost = rooms[roomID].player1info.money > 0 ? rooms[roomID].player1info.money : 1000;
    let playerobj = players[socket.id];
    if (playerinfo.money >= cost) {
      curr_players.push(socket.id);
      rooms[roomID].players = curr_players;
      rooms[roomID].jsbApp = initjsbApp();
      rooms[roomID].jsbApp.player1money = cost;
      rooms[roomID].jsbApp.player2money = cost;
      rooms[roomID].jsbApp.tablemoney = cost;
      rooms[roomID].player2info = { id: socket.id, name: name, iframe: playerinfo.iframe, assisstant: playerobj.assisstant, currentevent: playerobj.currentevent, chatenabled: playerobj.chatenabled, gamename: playerinfo.gamename, randomevent: playerobj.randomevent};
      rooms[roomID].jsbApp.player1info = rooms[roomID].player1info;
      rooms[roomID].jsbApp.player2info = rooms[roomID].player2info;
      rooms[roomID].jsbApp.status = ACTION_SELECTING_WAGER;
      rooms[roomID].jsbApp.chatenabled = playerobj.chatenabled && rooms[roomID].player1info.chatenabled;
      rooms[roomID].jsbApp.botmode = botmode;
      players[socket.id].roomID = roomID;
      socket.join(roomID);
      socket.emit("player2Joined", { p2name: name, p1name: players[roomID], jsbApp: getjsbAppforClient(rooms[roomID].jsbApp) });
      socket.broadcast.emit("player1Joined", { p2name: players[roomID], p1name: name, jsbApp: getjsbAppforClient(rooms[roomID].jsbApp) });
      console.log(name + "- Room joined Id:" + roomID);
      //addplayerdata(socket.id,roomID,name);
      //addroomdata(rooms[roomID]);
    } else {
      socket.emit("showmessage", { code: 100, message: "Not enough money to join room" });
    }
  } else {
    if (rooms.hasOwnProperty(roomID) && rooms[roomID].players.length > 1) {
      socket.emit("showmessage", { code: 100, message: "Room is full" });
    }
  }
}

function createGame(socket, data, id, bot) {
  const roomID = randomstring.generate({ length: 4 });
  let playerobj = players[socket.id];
  socket.join(roomID);
  let assisstant = playerobj.assisstant;
  let currentevent = playerobj.currentevent;
  if(bot){
    assisstant = playerobj.randomevent.character;
    currentevent = assisstant.blackjackevents[playerobj.randomevent.eventname];
  }
  rooms[roomID] = { players: [socket.id], player1info: { id: id, name: data.name, iframe: data.playerinfo.iframe, money: data.playerinfo.money, assisstant: assisstant, currentevent: currentevent, chatenabled: playerobj.chatenabled, gamename: data.playerinfo.gamename }, private: data.private , randomevent: playerobj.randomevent};
  players[socket.id].roomID = roomID;
  console.log("Room created by " + data.name + " Id:" + roomID) + " Private Room:" + data.private;
  socket.emit("newGame", { roomID: roomID });
  //addplayerdata(socket.id, roomID,data.name);
  return roomID;
}

function getjsbAppforClient(jsbApp) {
    let filterjsbApp = {};
    filterjsbApp.player1Hand = jsbApp.player1Hand.map(a => ({...a}));
    if(jsbApp.gameStatus==1){
        filterjsbApp.player1Hand[0]=hiddencardtemp;
    }
    filterjsbApp.player2Hand = jsbApp.player2Hand;
    filterjsbApp.suits = jsbApp.suits;
    filterjsbApp.values = jsbApp.values;
    filterjsbApp.keys = jsbApp.keys;
    filterjsbApp.status = jsbApp.status;
    filterjsbApp.gameStatus = jsbApp.gameStatus; // flag that game has not yet been won
    filterjsbApp.p1wins = jsbApp.p1wins; // flag that game has not yet been won
    filterjsbApp.draws = jsbApp.draws; // flag that game has not yet been won
    filterjsbApp.p2wins = jsbApp.p2wins; // flag that game has not yet been won
    filterjsbApp.games = jsbApp.games; // flag that game has not yet been won
    filterjsbApp.roomID = jsbApp.roomID;
    filterjsbApp.player1money = jsbApp.player1money;
    filterjsbApp.player2money = jsbApp.player2money;
    filterjsbApp.tablemoney = jsbApp.tablemoney;
    filterjsbApp.wager = jsbApp.wager;
    filterjsbApp.gameComplete = jsbApp.gameComplete;
    filterjsbApp.online = jsbApp.online;
    filterjsbApp.chatenabled = jsbApp.chatenabled;
    filterjsbApp.player1info = JSON.parse(JSON.stringify(jsbApp.player1info));
    delete filterjsbApp.player1info["id"];
    filterjsbApp.player2info = JSON.parse(JSON.stringify(jsbApp.player2info));
    delete filterjsbApp.player2info["id"];
    filterjsbApp.chat = jsbApp.chat;
    return filterjsbApp;
}

function card(suit, value, name, key, color) {
    this.suit = suit; // string of c/d/h/s
    this.value = value; // number 1 - 10
    this.name = name; // string of the full card name
    this.key = key;   // used for computing counting
    this.color = color;
}
//game code
function initjsbApp(){
    var jsbApp = {};
    // initialize variables to track hands/cards/etc.
    jsbApp.player1Hand = [];
    jsbApp.player2Hand = [];
    jsbApp.deck = [];
    jsbApp.suits = ['clubs <span class="bold">&#9827</span>', 'diamonds <span class="redcard">&#9830</span>', 'hearts <span class="redcard">&#9829</span>', 'spades <span class="bold">&#9824</span>'];
    jsbApp.suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');
    jsbApp.color = ['black', 'red', 'black', 'red'];
    jsbApp.values = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
    jsbApp.keys = ["A", 2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K"];
    jsbApp.gameStatus = 0; // flag that game has not yet been won
    jsbApp.p1wins = 0; // flag that game has not yet been won
    jsbApp.draws = 0; // flag that game has not yet been won
    jsbApp.p2wins = 0; // flag that game has not yet been won
    jsbApp.games = 0; // flag that game has not yet been won
    jsbApp.deck = createDeck(jsbApp);
    jsbApp.cardcount = {};
    jsbApp.player1money = 0;
    jsbApp.player2money = 0;
    jsbApp.tablemoney = 0;
    jsbApp.wager = 0;
    jsbApp.online = true;
    jsbApp.gameComplete = false;
    jsbApp.chat = {message:[],p1lastseen:0,p2lastseen:0};
    return jsbApp;
}
function createDeck(jsbApp) {
    var deck = [];
    // loop through suits and values, building cards and adding them to the deck as you go
    for (var a = 0; a < jsbApp.suits.length; a++) {
        for (var b = 0; b < jsbApp.values.length; b++) {
            var cardValue = b + 1;
            var cardTitle = "";            
            if (cardValue > 10){
                cardValue = 10;
            }
            if (cardValue != 1) {
                cardTitle += (jsbApp.values[b] + " of " + jsbApp.suits[a] + " (" + cardValue + ")");
            }
            else
            {
                cardTitle += (jsbApp.values[b] + " of " + jsbApp.suits[a] + " (" + cardValue + " or 11)");
            }
            var newCard = new card(jsbApp.suits[a], cardValue, cardTitle, jsbApp.keys[b], jsbApp.color[a]);
            deck.push(newCard);
            

        }
    }
    //console.log("Deck created! Deck size: " + deck.length)
    deck = shuffle(deck);
    return deck;
}
function shuffle(deck) {
    // console.log("Begin shuffle...");
    var shuffledDeck = [];
    var deckL = deck.length;
    for (var a = 0; a < deckL; a++)
    {
        var randomCard = getRandomInt(0, (deck.length));        
        shuffledDeck.push(deck[randomCard]);
        deck.splice(randomCard, 1);        
    }
    //resetcardcount();
    return shuffledDeck;
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    // console.log("Min: " + min + " Max: " + max);
    return Math.floor(Math.random() * (max - min)) + min;
    // code based on sample from MDN
}
const count_tech = ["Hi/Lo","Omega II","Wrong Halves"]
function cc(jsbApp,hand) {
  var card = hand[hand.length-1]
  for(var i in count_tech){
    jsbApp.cardcount[count_tech[i]]=countcardfortype(jsbApp,count_tech[i],card)
  }
}
function countcardfortype (jsbApp,type, card){
    var key = card.key;
    var cardcount = jsbApp.cardcount[type]
    if(type=="Hi/Lo"){
      switch (key) {
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
          cardcount++;
          break;
        case 7:
        case 8:
        case 9:
          cardcount = cardcount;
          break;
        case 10:
        case "J":
        case "Q":
        case "K":
        case "A":
          cardcount--;
          break;
      }
    }
    if(type=="Omega II"){  //Omega II
      switch (key) {
        case 2:
        case 3:
        case 7:
          cardcount++;
          break;
        case 4:
        case 5:
        case 6:
          cardcount+=2;
          break;
        case 8:
        case "A":
          cardcount = cardcount;
          break;
        case 9:
          cardcount--;
          break;
        case 10:
        case "J":
        case "Q":
        case "K":
          cardcount-=2;
          break;
      }
    }
    else if(type=="Wrong Halves II"){ //Wrong Halves II
      switch (key) {
        case 5:
          cardcount+=1.5;
          break;
        case 3:
        case 4:
        case 6:
          cardcount++;
          break;
        case 2:
        case 7:
          cardcount+=0.5;
          break;
        case 9:
          cardcount -= 0.5;
          break;
        case 8:
        case 10:
        case "J":
        case "Q":
        case "K":
        case "A":
            cardcount=cardcount;
            break;
      }
    }
    return cardcount;
  }
  function handTotal(hand) {
    //console.log("Checking hand value");
    var total = 0;
    var hidden = false;
    var aceFlag = 0; // track the number of aces in the hand
    for (var i = 0; i < hand.length; i++) {
        //console.log("Card: " + hand[i].name);
        total += hand[i].value;
        if (hand[i].value == 1)
        {
            aceFlag += 1;
        }
    }
    // For each ace in the hand, add 10 if doing so won't cause a bust
    // To show best-possible hand value
    for (var j = 0; j < aceFlag; j++)
    {
        if (total + 10 <= 21)
        {
            total +=10;
        }
    }
    // console.log("Total: " + total);
    return total;
}
function player2wins(jsbApp){
  jsbApp.p2wins++;
  let wager = parseInt(jsbApp.wager);
  jsbApp.player2money = parseInt(jsbApp.player2money) + wager;
  jsbApp.player1money = parseInt(jsbApp.player1money) - wager;
  jsbApp.gameComplete = jsbApp.player1money==0;
  jsbApp.status = "Player 2 wins.";
}
function player1wins(jsbApp){
  jsbApp.p1wins++;
  let wager = parseInt(jsbApp.wager);
  jsbApp.player1money = parseInt(jsbApp.player1money) + wager;
  jsbApp.player2money =  parseInt(jsbApp.player2money) - wager;
  jsbApp.gameComplete = jsbApp.player2money==0;
  jsbApp.status = "Player 1 wins.";
}
function gametie(jsbApp){
  jsbApp.draws++;
  jsbApp.status = "Game tied.";
}
function drawcard(jsbApp){
  if(jsbApp.deck.length==0){
    jsbApp.deck = createDeck(jsbApp);
  }
  return jsbApp.deck.pop();
}
function addplayerdata(id, roomID, name){
  let todayDate = new Date().toISOString().slice(0, 10);
  let path = 'data/playerdata-'+todayDate+'.txt';
  let data = "\nPlayer ID:" +id+" Room ID:"+roomID+" Name:"+name+" Time:"+new Date().toLocaleTimeString();
  if(!fs.existsSync(path)){
    fs.writeFile(path, data, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }else{
    fs.appendFile(path,data, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }
}
function addroomdata(data){
  let todayDate = new Date().toISOString().slice(0, 10);
  let path = 'data/roomdata-'+todayDate+'.txt';
  data = '\nPlayer 1:'+data.player1info.name+" Player 2:"+data.player2info.name+" Time:"+new Date().toLocaleTimeString();
  if(!fs.existsSync(path)){
    fs.writeFile(path, data, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }else{
    fs.appendFile(path,data, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }
}
function cleanupdata(){
  let path = 'data';
  let todayDate = new Date().toISOString().slice(0, 10);
  fs.readdir(path, (err, files) => {
    if(files.length>10){
      // print file last modified date
      files.forEach(file => {
        if (!file.includes(todayDate)){
          fs.unlink(path+'/'+file, (err => {
            if (err) console.log(err);
            else {
              console.log("\nDeleted file: "+file);
            }
          }));
        }  
      })
    }
  });
}
function getRoomID(id){
  return players[id].roomID;
}

function hitCard(socket,roomID,id){
  if(rooms.hasOwnProperty(roomID)){
    let jsbApp = rooms[roomID].jsbApp;
    let player1 = id == rooms[roomID].player1info.id;
    let player2 = id == rooms[roomID].player2info.id;
    let playerHand = player1?jsbApp.player1Hand:jsbApp.player2Hand;
    if((jsbApp.gameStatus==2 && player1) ||(jsbApp.gameStatus==1 && !player1)){
      jsbApp.status = "";
      playerHand.push(drawcard(jsbApp));
      cc(jsbApp,playerHand);
      let total = handTotal(playerHand);
      if(player2){
        if(total>21){
          player1wins(jsbApp);
          jsbApp.gameStatus = 0 //game complete
          jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
          io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
          return;
        }else if(total==21){
          let p1total = handTotal(jsbApp.player1Hand);
          if(p1total==total){
            gametie(jsbApp);
            jsbApp.gameStatus = 0; //game complete
            jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
            io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
          }else if(p1total<total){
            jsbApp.gameStatus = 2 //player 1 (dealer) turn
            jsbApp.status = ACTION_SELECTING_CHOICE_1;
            if(jsbApp.botmode){
              botChoice(socket,jsbApp);
            }else{
              socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
            }
          }
        }else {
          jsbApp.status = ACTION_SELECTING_CHOICE_2
          socket.emit("player2choice",{jsbApp:getjsbAppforClient(jsbApp)});
        }
      }else if(player1){
        if(total>21){
          player2wins(jsbApp);
          jsbApp.gameStatus = 0 //game complete
          jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
          io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
          return;
        }else if(total==21){
          jsbApp.gameStatus = 0 //game end
          let p2total = handTotal(jsbApp.player2Hand);
          if(p2total==total){
            gametie(jsbApp);
          }else{
            player1wins(jsbApp);
          }
          jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
          io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
        }else{
          let p2total = handTotal(jsbApp.player2Hand);
          if(total>p2total){
            player1wins(jsbApp);
            jsbApp.gameStatus = 0 //game complete
            jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
            io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
          }else{
            jsbApp.gameStatus = 2;
            jsbApp.status = ACTION_SELECTING_CHOICE_1;
            if(jsbApp.botmode){
              botChoice(socket,jsbApp);
            }else{
              socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
            }
          }
        }
      }
      io.in(roomID).emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
    }else{
      console.log("incorrect game action :"+jsbApp.status+" "+jsbApp.gameStatus+' '+player1)
    }
  }
}

function botChoice(socket,jsbApp){
  let p1total = handTotal(jsbApp.player1Hand);
  let p2total = handTotal(jsbApp.player2Hand);
  if(p1total<16 || p1total<p2total){
    hitCard(socket,jsbApp.roomID,"dummyid");
  }else{
    stayTurn(socket,jsbApp.roomID,"dummyid");
  }
}

function stayTurn(socket, roomID, id){
  if(rooms.hasOwnProperty(roomID)){
    let jsbApp = rooms[roomID].jsbApp;
    let player1 = id == rooms[roomID].player1info.id;
    let player2 = id == rooms[roomID].player2info.id;
    let p1total = handTotal(jsbApp.player1Hand);
    let p2total = handTotal(jsbApp.player2Hand);
    if((jsbApp.gameStatus==2 && player1) ||(jsbApp.gameStatus==1 && player2)){
      jsbApp.status ="";
      if(player2){
        if(p2total< p1total){
          jsbApp.gameStatus = 0;  // game ends
          player1wins(jsbApp);
          jsbApp.status = ACTION_SELECTING_WAGER;
          io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
        }else{
          jsbApp.gameStatus = 2;  // player 1 (dealer) turn
          jsbApp.status = ACTION_SELECTING_CHOICE_1;
          if(jsbApp.botmode){
            botChoice(socket,jsbApp);
          }else{
            socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
          }
        }
      }
      else{
        if(p1total==p2total){
          gametie(jsbApp);
        }else if(p1total< p2total){
          player2wins(jsbApp);
        }
        jsbApp.gameStatus = 0;  // game end
        jsbApp.status = !jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
        io.in(roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
      }
      io.in(roomID).emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
    }else{
      console.log("incorrect game action"+jsbApp.gameStatus+' '+player1)
    }
  }
}