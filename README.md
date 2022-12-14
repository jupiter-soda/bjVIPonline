# bjVIPonline Server

This is a Node.js server for blackjack game. This project is associated with the mod for custom VIP characters for the game Love & Vice. 

## Installation

You need to install Node.js(v16.18.0 or greater) to run the server.
Clone the repo and open your terminal to the repo path. The below command will install all the dependencies.
```
$ npm install
```

You can then run the server with Node.js by using the command
```
$ node app.js
```

You can create a .env file in the root directory and add the following lines to customize the port for the server.
```
PORT = 4000
```

## Features

The server application lets you run your own instance of the blackjack game server. 
The game will have a default test server it will be accesssing, this can be modified in the game at the location below.
```
Home->Computer->Mod Settings
```
All data in the server is in memory and no data caching is currently done on the server. 
The server can also be deployed to a cloud Platform as a Service (PaaS) like Heroku.