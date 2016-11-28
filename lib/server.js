var http = require('http');
var auth = require('basic-auth');

module.exports = createServer;

var httpServer;
var options = {
  path: '/',
  username: '',
  password: ''
};

var HEADERS = {
  NAME: 'x-contentful-webhook-name'
};

var EVENTS = {
  ERROR: 'ContentManagement.error',
  ALL_SUCCESSFUL_REQUESTS: 'ContentManagement.*'
};

function createServer(opts) {
  if (opts && opts.path) {
    options.path = opts.path;
  }
  if (opts && opts.username) {
    options.username = opts.username;
  }
  if (opts && opts.password) {
    options.password = opts.password;
  }
  httpServer = http.createServer(handleRequest);
  httpServer.mountAsMiddleware = handleRequest;
  return httpServer
}

function handleRequest(req, res){

  var path = req.url.split('?').shift();
  var name = req.headers[HEADERS.NAME];
  var err;
  var incomingUsername = '';
  var incomingPassword = '';
  var incomingCredentials;

  // Handle non matching path
  if(path !== options.path){
    err = new Error('The request does not match the path');
    httpServer.emit(EVENTS.ERROR, err, req);
    return404();
    return;
  }

  // Handle incorrect methods
  if(req.method !== 'POST'){
    err = new Error('The request did not use the POST method')
    httpServer.emit(EVENTS.ERROR, err , req);
    return404();
    return;
  }

  // Handle missing name
  if(!name){
    return return400('X-Contentful-Webhook-Name not specified in request');
  }

  // Verify credentials
  incomingCredentials = auth(req);
  if(incomingCredentials){
    incomingUsername = incomingCredentials.name;
    incomingPassword = incomingCredentials.pass;
  }
  if((incomingUsername !== options.username) || (incomingPassword !== options.password)){
    err = new Error('Unauthorized: request contained invalid credentials')
    httpServer.emit(EVENTS.ERROR, err , req, incomingCredentials);
    return returnAccessDenied();
  }

  // Emit name and wildcard event
  httpServer.emit(name, req);
  httpServer.emit(EVENTS.ALL_SUCCESSFUL_REQUESTS, name, req);

  // Return 200 OK
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end('{"ok":true}');

  function return400(message){
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  function returnAccessDenied(){
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Contentful webhooks"' });
    res.end();
  }

  function return404(){
    res.statusCode = 404;
    res.end();
  }

}
