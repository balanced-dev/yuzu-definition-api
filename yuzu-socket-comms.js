
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 })

var id = 0;
var lookup = {};

function noop() {}
 
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', function (ws) {

    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', function incoming(message) {
        
        if(message.startsWith('setup:'))
        {
            var id = message.replace('setup:', '');
            lookup[id] = ws;
            console.log('yuzu editor connection added : '+ id);
        }

    });

});

var send = function(data, id) {

    if(lookup.hasOwnProperty(id)) {
      lookup[id].send(JSON.stringify(data));
    }
    else {
      console.log('yuzu editor not connected, refresh browser');
    }


}
 
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log('yuzu editor connection added');
      return ws.terminate();
    }
 
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

module.exports = send;