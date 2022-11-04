let firstPlayer=false;
let classname="player2";
let playername="";
let roomID;
let jsbApp = {};
let jsbAppElems = {};
let userinfo = {money:1000,iframe:false,chatenabled:false};

//New Game Created Listener
socket.on("newGame",(data)=>{
    $(".newRoom").hide();
    $(".joinRoom").hide();
    $("#message").html("Waiting for player 2,Room ID: "+data.roomID).show();
    roomID=data.roomID;
})

//Player 2 Joined
socket.on("player2Joined",(data)=>{
    transition(data);
  })
  
//Player 1 Joined
socket.on("player1Joined",(data)=>{
    transition(data);
})
socket.on("beginBlackjack",(data)=>{
    loadBlackjack(data);
})
socket.on("updateblackjacktable",(data)=>{
    loadBlackjack(data);
    sendmessagefromiframe(JSON.stringify({method:"updatedata","jsbApp":data.jsbApp}));
})
socket.on("player2choice",(data)=>{
    jsbAppElems.newgame.classList.add("hidden");
    if(!firstPlayer){
        $('#buttonBox').removeClass('hidden');
    }else{
        $('#buttonBox').addClass('hidden');
    }
    loadBlackjack(data);
});
socket.on("player1choice",(data)=>{
    if(firstPlayer){
        $('#buttonBox').removeClass('hidden');
    }else{
        $('#buttonBox').addClass('hidden');
    }
    loadBlackjack(data);
});
socket.on("player2wager",(data)=>{
    loadBlackjack(data);
    jsbAppElems.buttonBox.classList.add('hidden');
    if(!data.jsbApp.gameComplete){
        loadwager();
    }else{
        jsbAppElems.newgame.classList.add('hidden');
        sendmessagefromiframe(JSON.stringify({method:"gameComplete", jsbApp:data.jsbApp}));

    }
});
socket.on("showmessage",(data)=>{
    switch(data.code){
    case 100:
        alert(data.message);
    default:
        console.log(data);
    }
});
socket.on("unreadchat",(data)=>{
    $('#chat button').attr('data-count',data.count);
    jsbApp.chat = data.chat;
    if(document.getElementById('chatpopup').open){
        loadchatmessage();
    }
});
socket.on("availablerooms",(data)=>{
    $('#roomslist').html('');
    let rooms = data.rooms;
    let headers = ["RoomID", "Player","Model","Event","Cost"];
    let table = document.createElement("TABLE");  //makes a table element for the page
        
    for(let i = 0; i < rooms.length; i++) {
        let row = table.insertRow(i);
        let playerinfo = rooms[i].playerinfo;
        row.insertCell(0).innerHTML = rooms[i].roomID;
        row.insertCell(1).innerHTML = playerinfo.name;
        if(playerinfo.iframe){
            row.insertCell(2).innerHTML = playerinfo.assisstant.name;
            row.insertCell(3).innerHTML = playerinfo.assisstant.currentevent;
            row.insertCell(4).innerHTML = playerinfo.currentevent.cost;
        }
    }

    let header = table.createTHead();
    let headerRow = header.insertRow(0);
    for(var i = 0; i < headers.length; i++) {
        headerRow.insertCell(i).innerHTML = headers[i];
    }
    table.classList.add('fl-table');
    $('#roomslist').html(table);
    $('#roomslist').append('Rooms found :'+rooms.length);
    $('#roomslist').removeClass('hidden');
    
});
socket.on("hidenewgame",(data)=>{
    jsbAppElems.newgame.classList.add('hidden');
    loadBlackjack(data);
});
const transition=(data)=>{
    $(".newRoom").hide();
    $(".joinRoom").hide();
    $(".leaderboard").show();
    $(".controls").show();
    $(".player1 .name").html(data.p1name);
    $(".player2 .name").html(data.p2name);
    $("#message").html(data.p2name+" is here!").show();
    $.get( "loadtemplate",{roomID:roomID}, function(datahtml) {
        $('#blackjackdiv').html(datahtml);
        initjsbGameApp();
        loadwager();
        loadBlackjack(data);
        if(!data.jsbApp.chatenabled){
            $('#chat').hide();
        }
        const dialog = document.querySelector('dialog');
        dialog.addEventListener('close', (event) => {
            $('#chat button').attr('data-count',"");
        });
        dialog.querySelector("button.cancel").addEventListener("click", () => {
            dialog.close();
          });
        $('.container').hide();
    });
}

var loadpage = function(){
    $(".leaderboard").hide();
    $(".controls").hide();
    $('#message').hide();
        //Create Game Event Emitter
    $(".createBtn").click(function(){
        firstPlayer=true;
        classname="player1";
        if($("input[name=p1name").val().length==0){
            alert("Fill in a name");
            return;
        }
        const playerName=$("input[name=p1name").val();
        playername = playerName;
        socket.emit('createGame',{name:playerName,private:document.getElementById('privateroom').checked,playerinfo:userinfo});
    });
    //Join Game Event Emitter
    $(".joinBtn").click(function(){
        if($("input[name=p2name").val().length==0){
            alert("Fill in a name");
            return;
        }
        window.location !== window.parent.location?true:false
        const playerName=$("input[name=p2name").val();
        playername = playerName;
        roomID=$("input[name=roomID").val(); 
        socket.emit('joinGame',{
            name:playerName,
            roomID:roomID,
            playerinfo:userinfo
        });
    });
    $("#listrooms").click(function(){
        socket.emit('listrooms');
    });
    userinfo.iframe = window.location !== window.parent.location?true:false;
    sendmessagefromiframe(JSON.stringify({method:"inituserinfo"}));  
    sendmessagefromiframe(JSON.stringify({method:"initdata"}));
}
function initjsbGameApp(){
    // Store important elements in variables for later manipulation
    jsbAppElems.p1cards = document.getElementById('p1cards');
    jsbAppElems.p2cards = document.getElementById('p2cards');
    jsbAppElems.hitButton = document.getElementById('hit');
    jsbAppElems.stayButton = document.getElementById('stay');
    jsbAppElems.playButton = document.getElementById('play');
    jsbAppElems.textUpdates = document.getElementById('textUpdates');
    jsbAppElems.buttonBox = document.getElementById('buttonBox');
    jsbAppElems.p1handtext = document.getElementById('p1hand');
    jsbAppElems.p2handtext = document.getElementById('p2hand');
    jsbAppElems.tracker = document.getElementById('tracker');
    jsbAppElems.newgame = document.getElementById('newgame');
    jsbAppElems.bet = document.getElementById('wager');
    jsbAppElems.introbox = document.getElementById('introbox')
    jsbAppElems.begin = document.getElementById("begin");
    jsbAppElems.status = document.getElementById('status');
    jsbAppElems.playButton.addEventListener("click", beginGame);
    jsbAppElems.hitButton.addEventListener("click", clickHitButton);
    jsbAppElems.stayButton.addEventListener("click", clickStayButton);
}
function beginGame(){
    socket.emit("beginGame",{roomID:roomID,wager:jsbAppElems.bet.value});
}
function loadBlackjack(data){
    jsbApp = data.jsbApp;
    let player1Hand = jsbApp.player1Hand;
    loadHand(1,player1Hand,jsbAppElems.p1cards,jsbAppElems.p1handtext);
    let player2Hand = jsbApp.player2Hand;
    loadHand(2,player2Hand,jsbAppElems.p2cards,jsbAppElems.p2handtext);
    jsbAppElems.status.innerHTML = jsbApp.status;
    jsbApp.dealer = firstPlayer;
    track();
    sendmessagefromiframe(JSON.stringify({method:"updatedata",jsbApp:data.jsbApp}));
}
function loadHand(num,hand,carddiv,textdiv){
    carddiv.innerHTML = '';
    var total = handTotal(hand);
    for(let i in hand){
        $(carddiv).append("<li class='gamecards'>" + hand[i].name + "</li>");
    }
    textdiv.innerHTML = "Player "+num+" Hand (" + total + ")"; // update player hand total
   
}
function clickHitButton(){
    jsbAppElems.buttonBox.classList.add('hidden');
    socket.emit("hitcard",{roomID:roomID,wager:jsbAppElems.bet.value});
}
function clickStayButton(){
    jsbAppElems.buttonBox.classList.add('hidden');
    socket.emit("stayturn",{roomID:roomID});
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
        if(hand[i].key == "hidden"){
            hidden= true;
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
    return hidden?total+' + Hidden card':total;
}
function loadwager(){
    if(!firstPlayer){
        jsbAppElems.newgame.classList.remove('hidden');
    }else{
        jsbAppElems.newgame.classList.add('hidden');
    }
    
}
function track(){
    let wins = firstPlayer?jsbApp.p1wins:jsbApp.p2wins;
    let losses = firstPlayer?jsbApp.p2wins:jsbApp.p1wins;
    jsbAppElems.tracker.innerHTML = "<p>Wins: " + wins + " Draws: " + jsbApp.draws + " Losses: " + losses + "</p><p>Wager:"+jsbApp.wager+"</p>";
}
function loadchatpopup(obj){
    $(obj).attr('data-count',"");
    loadchatmessage();
    document.getElementById('chatpopup').showModal();
    socket.emit('readchat',{count: jsbApp.chat.message.length});
}
function loadchatmessage(){
    let chatcontainer = document.createElement('div');
    chatcontainer.setAttribute("id","chatcontainer");
    chatcontainer.setAttribute("class","chatcontainer");
    for(var i in jsbApp.chat.message){
        let messagecont = document.createElement('div');
        messagecont.setAttribute("class",jsbApp.chat.message[i].classname);
        let namecont = document.createElement('span');
        namecont.setAttribute("class","chatname");
        namecont.innerHTML=jsbApp.chat.message[i].playername;
        messagecont.append(namecont);
        let message = document.createElement('span');
        message.setAttribute("player1",jsbApp.chat.message[i].player1);
        message.innerHTML=jsbApp.chat.message[i].content;
        messagecont.append(message)
        chatcontainer.append(messagecont);
    }
    document.getElementById("chatarea").innerHTML = chatcontainer.outerHTML;
}
function sendchatmessage(){
    let message = document.getElementById("chatmsg").value
    if(message.length==0){
        return;
    }
    document.getElementById("chatmsg").value = "";
    let messageObj = {};
    messageObj.content = message;
    messageObj.player1 = firstPlayer;
    messageObj.classname = classname;
    messageObj.playername = playername;
    jsbApp.chat.message.push(messageObj);
    loadchatmessage();
    socket.emit('sendchatmessage',{message:message});
}
function parsedatamodiframe(data){
    data = JSON.parse(data)
    var method = data.method;
    switch(method) {
      case "initplayerdata":
        socket.emit('initplayerdata',{currentevent:data.currentevent,assisstant:data.assisstant,chatenabled:userinfo.chatenabled});
        break;
    case "inituserinfo":
        userinfo.money = data.money?data.money:userinfo.money;
        userinfo.chatenabled = data.chatenabled;
        break;
    default:
        console.log("Invalid message");
    } 
  }
function sendmessagefromiframe(message){
    if(userinfo.iframe){
        window.top.postMessage(message, "*");
    }
}
window.addEventListener('message', function(event) {
    // console.log("Message received from the parent: " + event.data); // Message received from parent
    parsedatamodiframe(event.data);
  });