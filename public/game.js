let firstPlayer=false;
let roomID;
let jsbApp = {};
let jsbAppElems = {};

//New Game Created Listener
socket.on("newGame",(data)=>{
    $(".newRoom").hide();
    $(".joinRoom").hide();
    let message = JSON.stringify({method:"initdata"});
    window.top.postMessage(message, "*");
    $("#message").html("Waiting for player 2, room ID is "+data.roomID).show();
    roomID=data.roomID;
})

//Player 2 Joined
socket.on("player2Joined",(data)=>{
    transition(data)  ;
  })
  
//Player 1 Joined
socket.on("player1Joined",(data)=>{
    transition(data)  ;
})
socket.on("beginBlackjack",(data)=>{
    loadBlackjack(data);
})
socket.on("updateblackjacktable",(data)=>{
    loadBlackjack(data);
    let message = JSON.stringify({method:"updatedata",jsbApp:data.jsbApp});
    window.top.postMessage(message, "*");
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
    }
});
socket.on("showmessage",(data)=>{
    switch(code){
    case 100:
        let message = JSON.stringify({method:"alert", message:data.message});
        window.top.postMessage(message, "*");
        alert(data.message);
    default:
        console.log(data);
    }
});

const transition=(data)=>{
    $(".newRoom").hide();
    $(".joinRoom").hide();
    $(".leaderboard").show();
    $(".controls").show();
    $(".player1 .name").html(data.p1name);
    $(".player2 .name").html(data.p2name);
    $("#message").html(data.p2name+" is here!").show();
    $.get( "loadtemplate", function(datahtml) {
        $('#blackjackdiv').html(datahtml);
        initjsbGameApp();
        loadwager();
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
        if($("input[name=p1name").val().length==0){
            alert("Fill in a name");
            return;
        }
        const playerName=$("input[name=p1name").val();
        socket.emit('createGame',{name:playerName});
    });
    //Join Game Event Emitter
    $(".joinBtn").click(function(){
        if($("input[name=p2name").val().length==0){
            alert("Fill in a name");
            return;
        }
        const playerName=$("input[name=p2name").val();
        roomID=$("input[name=roomID").val();
        let message = JSON.stringify({method:"initdata"});
        window.top.postMessage(message, "*");    
        socket.emit('joinGame',{
            name:playerName,
            roomID:roomID
        });
    });
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
    let message = JSON.stringify({method:"updatedata",jsbApp:jsbApp});
    window.top.postMessage(message, "*"); 
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
    jsbAppElems.tracker.innerHTML = "<p>Wins: " + wins + " Draws: " + jsbApp.draws + " Losses: " + losses + "</p>";
    // document.getElementById("playermoney").innerHTML =  "Money: &dollar;"+jsbApp.totalmoney;
    // document.getElementById("dealermoney").innerHTML =  "Money: &dollar;"+jsbApp.dealermoney;
}
function parsedatamodiframe(data){
    data = JSON.parse(data)
    var method = data.method;
    switch(method) {
      case "initplayerdata":
        socket.emit('initplayerdata',{roomID:roomID,currentevent:data.currentevent,assisstant:data.assisstant});
        break;
    default:
        console.log("Invalid message");
    } 
  }
window.addEventListener('message', function(event) {
    console.log("Message received from the parent: " + event.data); // Message received from parent
    parsedatamodiframe(event.data);
  });