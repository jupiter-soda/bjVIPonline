const blackjacktabletemplate = '<div class="blackjackplayarea"><div class="buttonbox" id="introbox"> <div class="textupdates"> Choose the event you want to play </div><div id="autobtnbox" class="autobtnbox divHidden">Auto mode:<input type="checkbox" tabindex="0" id="autobj"></div><select id="blackjackeventname"></select><button alt="begin" id="begin">Play</button> </div><div class="buttonbox divHidden" id="newgame"><div class="textupdates" id="textUpdates"> Press \'New Game\' to begin! </div> <div id="wagerbox" style="width: 431px; text-align: center;">    How much would you like to bet?<br>    $<input type="text" id="wager" maxlength="255"><br></div>   <button alt="play" id="play">New Game</button> </div> <div class="buttonbox hidden" id="buttonBox"> <button alt="hit" id="hit">Hit</button> <button alt="stay" id="stay">Stay</button> </div> <table class="gamehands"> <tr> <th id="phand"> Your Hand </th> <th id="dhand"> Dealer\'s Hand </th> </tr> <tr> <td id="pcards">No cards dealt yet</td> <td id="dcards">No cards dealt yet</td> </tr> </table> <div id="tracker" class="buttonbox"> <p>Wins: 0 Draws: 0 Losses: 0</p> </div> <div class="buttonbox"> <p><span class="bold" >simple strategy suggestion: </span></p> <span id="choice" class="bold redcard"></span> <!--<br /> <br /> <img src="img/stratchart.png" />--> </div></div>'; 
var loadpage = function(){
    $.get( "loadtemplate", function(data) {
            $('#blackjackdiv').html(blackjacktabletemplate);
        });
}