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
const blackjacktabletemplate = '<div class="blackjackplayarea"><div class="buttonbox divHidden" id="newgame"><div class="textupdates" id="textUpdates"> Press \'New Game\' to begin! </div> <div id="wagerbox">    How much would you like to bet?<br>    $<input type="text" id="wager" maxlength="255"><br></div>   <button alt="play" id="play">New Game</button> </div> <div class="buttonbox hidden" id="buttonBox"> <button alt="hit" id="hit">Hit</button> <button alt="stay" id="stay">Stay</button> </div> <table class="gamehands"> <tr> <th id="p1hand"> Player 1\'s  Hand </th> <th id="p2hand"> Player 2\'s Hand </th> </tr> <tr> <td id="p1cards">No cards dealt yet</td> <td id="p2cards">No cards dealt yet</td> </tr> </table> <div id="tracker" class="buttonbox"> <p>Wins: 0 Draws: 0 Losses: 0</p> </div> <div class="buttonbox"> <p><span class="bold" >Status: </span></p> <span id="status" class="bold redcard"></span> <!--<br /> <br /> <img src="img/stratchart.png" />--> </div></div>'; 
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
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
      if(players.hasOwnProperty(socket.id)){
        let jsbApp = rooms.hasOwnProperty(players[socket.id]) && rooms.hasOwnProperty(players[socket.id]).jsbApp?rooms[players[socket.id]].jsbApp:{};
        if(jsbApp.length>0){
          jsbApp.gameComplete = true;
          socket.broadcast.emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
        }
        io.in(players[socket.id]).emit("showmessage",{code:100, message:"Player has disconnected."});
        delete rooms[players[socket.id]];
        delete players[socket.id];
        
      }
      console.log('A user disconnected');
    });
    socket.on("createGame",(data)=>{
        const roomID=randomstring.generate({length: 4});  
        rooms[roomID] = {players : [socket.id], player1info:{id:socket.id,name:data.name}, private:data.private};
        socket.join(roomID);        
        players[socket.id]=roomID;
        console.log("Room created by "+data.name+" Id:"+roomID)+" Private Room:"+data.private;
        socket.emit("newGame",{roomID:roomID});
    });
    //Join Game Listener
    socket.on("joinGame",(data)=>{
        if(rooms.hasOwnProperty(data.roomID) && rooms[data.roomID].players.length<2) {   
            var curr_players = rooms[data.roomID].players;
            let cost = rooms[data.roomID].player1info.currentevent.cost;
            if(data.money>=cost){
              curr_players.push(socket.id);
              rooms[data.roomID].players = curr_players;
              rooms[data.roomID].jsbApp = initjsbApp();
              rooms[data.roomID].jsbApp.player1money = cost;
              rooms[data.roomID].jsbApp.player2money = cost;
              rooms[data.roomID].jsbApp.tablemoney = cost;
              rooms[data.roomID].player2info = {id:socket.id,name:data.name};
              players[socket.id]=data.roomID;
              socket.join(data.roomID);
              socket.emit("player2Joined",{p2name: data.name,p1name:players[data.roomID]});
              socket.broadcast.emit("player1Joined",{p2name:players[data.roomID],p1name:data.name});
              console.log(data.name+"- Room joined Id:"+data.roomID);
            }else{
              socket.emit("showmessage",{code:100, message:"Not enough money to join room"});
            }
        }else{
          if(rooms.hasOwnProperty(data.roomID) && rooms[data.roomID].players.length>1){
            socket.emit("showmessage",{code:100, message:"Room is full"});
          }
        }
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
              jsbApp.gamebegin = jsbApp.gamebegin && true;
              if(!jsbApp.gamebegin && rooms[data.roomID].player1info.hasOwnProperty("currentevent")){
                jsbApp.player1money = rooms[data.roomID].player1info.currentevent.cost;
                jsbApp.player2money = jsbApp.player1money;
                jsbApp.tablemoney = jsbApp.player1money;
                jsbApp.gamebegin = true;
                jsbApp.online = true;
              }
              socket.join(data.roomID);
              io.in(data.roomID).emit("beginBlackjack",{jsbApp:getjsbAppforClient(jsbApp)});
              if(handTotal(jsbApp.player2Hand)<21){
                jsbApp.status = ACTION_SELECTING_CHOICE_2
                socket.emit("player2choice",{jsbApp:getjsbAppforClient(jsbApp)});
              }else{
                jsbApp.gameStatus = 2 // player 1(dealer) turn
                jsbApp.status = ACTION_SELECTING_CHOICE_1
                socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
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
      if(rooms.hasOwnProperty(data.roomID)){
        let jsbApp = rooms[data.roomID].jsbApp;
        let player1 = socket.id == rooms[data.roomID].player1info.id;
        let player2 = socket.id == rooms[data.roomID].player2info.id;
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
              jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
              io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
              return;
            }else if(total==21){
              let p1total = handTotal(jsbApp.player1Hand);
              if(p1total==total){
                gametie(jsbApp);
                jsbApp.gameStatus = 0; //game complete
                jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
                io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
              }else if(p1total<total){
                jsbApp.gameStatus = 2 //player 1 (dealer) turn
                jsbApp.status = ACTION_SELECTING_CHOICE_1;
                socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
              }
            }else {
              jsbApp.status = ACTION_SELECTING_CHOICE_2
              socket.emit("player2choice",{jsbApp:getjsbAppforClient(jsbApp)});
            }
          }else if(player1){
            if(total>21){
              player2wins(jsbApp);
              jsbApp.gameStatus = 0 //game complete
              jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
              io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
              return;
            }else if(total==21){
              jsbApp.gameStatus = 0 //game end
              let p2total = handTotal(jsbApp.player2Hand);
              if(p2total==total){
                gametie(jsbApp);
              }else{
                player1wins(jsbApp);
              }
              jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
              io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
            }else{
              let p2total = handTotal(jsbApp.player2Hand);
              if(total>p2total){
                player1wins(jsbApp);
                jsbApp.gameStatus = 0 //game complete
                jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
                io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
              }else{
                jsbApp.status = ACTION_SELECTING_CHOICE_1
                socket.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
              }
            }
          }
        }else{
          console.log("incorrect game action :"+jsbApp.status+" "+jsbApp.gameStatus+' '+player1)
        }
        io.in(data.roomID).emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
      }
  });
  socket.on("stayturn",(data)=>{
    if(rooms.hasOwnProperty(data.roomID)){
      let jsbApp = rooms[data.roomID].jsbApp;
      let player1 = socket.id == rooms[data.roomID].player1info.id;
      let player2 = socket.id == rooms[data.roomID].player2info.id;
      let p1total = handTotal(jsbApp.player1Hand);
      let p2total = handTotal(jsbApp.player2Hand);
      if((jsbApp.gameStatus==2 && player1) ||(jsbApp.gameStatus==1 && player2)){
        jsbApp.status ="";
        if(player2){
          if(p2total< p1total){
            jsbApp.gameStatus = 0;  // game ends
            player1wins(jsbApp);
            jsbApp.status = ACTION_SELECTING_WAGER;
            io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
          }else{
            jsbApp.gameStatus = 2;  // player 1 (dealer) turn
            jsbApp.status = ACTION_SELECTING_CHOICE_1;
            socket.broadcast.emit("player1choice",{jsbApp:getjsbAppforClient(jsbApp)});
          }
        }
        else{
          if(p1total==p2total){
            gametie(jsbApp);
          }else if(p1total< p2total){
            player2wins(jsbApp);
          }
          jsbApp.gameStatus = 0;  // game end
          jsbApp.status = jsbApp.gameComplete?jsbApp.status + ACTION_SELECTING_WAGER:jsbApp.status;
          io.in(data.roomID).emit("player2wager",{jsbApp:getjsbAppforClient(jsbApp)});
        }
      }else{
        console.log("incorrect game action"+jsbApp.gameStatus+' '+player1)
      }
      io.in(data.roomID).emit("updateblackjacktable",{jsbApp:getjsbAppforClient(jsbApp)});
    }

  });
  socket.on("initplayerdata",(data)=>{
    if(rooms.hasOwnProperty(data.roomID)) {   
      if(rooms[data.roomID].hasOwnProperty("player1info") && rooms[data.roomID].player1info.id == socket.id){
        rooms[data.roomID].player1info.currentevent = data.currentevent;
        rooms[data.roomID].player1info.assisstant = data.assisstant;
      }else if(rooms[data.roomID].hasOwnProperty("player2info") && rooms[data.roomID].player2info.id == socket.id){
        rooms[data.roomID].player2info.currentevent = data.currentevent;
        rooms[data.roomID].player2info.assisstant = data.assisstant;
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

});
const hiddencardtemp =  new card("", 0, "Hidden Card", "hidden");

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
    filterjsbApp.gameComplete = jsbApp.gameComplete;
    filterjsbApp.online = jsbApp.online;
    filterjsbApp.player1info = JSON.parse(JSON.stringify(jsbApp.player1info));
    delete filterjsbApp.player1info["id"];
    filterjsbApp.player2info = JSON.parse(JSON.stringify(jsbApp.player2info));
    delete filterjsbApp.player2info["id"];
    return filterjsbApp;
}

function card(suit, value, name, key) {
    this.suit = suit; // string of c/d/h/s
    this.value = value; // number 1 - 10
    this.name = name; // string of the full card name
    this.key = key;   // used for computing counting
}
//game code
function initjsbApp(){
    var jsbApp = {};
    // initialize variables to track hands/cards/etc.
    jsbApp.player1Hand = [];
    jsbApp.player2Hand = [];
    jsbApp.deck = [];
    jsbApp.suits = ['clubs <span class="bold">&#9827</span>', 'diamonds <span class="redcard">&#9830</span>', 'hearts <span class="redcard">&#9829</span>', 'spades <span class="bold">&#9824</span>'];
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
    jsbApp.gameComplete = false;
    // loadinitevents();
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
            var newCard = new card(jsbApp.suits[a], cardValue, cardTitle, jsbApp.keys[b]);
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