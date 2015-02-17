// server.js

// setup =======================================================
var express 				= require('express');
var app      				= express();
var http 					= require('http').Server(app);
var port     				= process.env.PORT || 8282;
var methodOverride			= require('method-override');
var cookieParser 			= require('cookie-parser');
var bodyParser  			= require('body-parser');
var session      			= require('express-session');
var hbs    					= require('hbs');
var io 						= require('socket.io')(http);
var _ 						= require('lodash');
var fs 						= require('fs');
var SHA256 					= require("crypto-js/sha256");

// configuration ==============================================

app.use(cookieParser()); //use cookies for auth
app.use(bodyParser()); //parse html forms

// handle POST parameters
// parse application/json
app.use(bodyParser.json());

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// override with the X-HTTP-Method-Override header in the request
// simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override'));

// set the static files location
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');


var dict = JSON.parse( fs.readFileSync('./app/dict.json', 'utf8') );

// handlebars ===================================================

app.engine('hbs', require('hbs').__express); //handlebars engine
require('./app/handlebars.js')(hbs);
hbs.registerPartials('./public/views/partials/');

// socket.io ====================================================

var makeTx = function (word) {
	var hash = SHA256(word);

}

var saveNewTxs = function (input, output, dict) {

}

io.on('connection', function (socket) {
	console.log("a user connected");
	socket.on('disconnect', function () {
		console.log("a user disconnected")
	});
	socket.on('change', function (string) {
		//tokenize string
		var tokens = _.words( string, /[^, ]+/g );
		//for each token
		var txs = [];
		for(var i = 0; i != tokens.length; i++){
			//if available, get translation from json
			if( _.has(dict, tokens[i]) ){
				txs[i] = dict[tokens[i]];
			} else {
				//else make new translation
				txs[i] = makeTx(tokens[i]);
			}
		}
		//add translation to output string
		var tx = _.reduce(txs, function (output, word) { return output + " " + word; });
				
		//emit 'translation' event with output string
		socket.emit('tx' tx);
	});
}

// routes =======================================================

require('./app/routes.js')(app); //load routes

// run ==========================================================

http.listen(port);
console.log("shalish-translator launched on port " + port);