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
var SHA256 					= require('crypto-js/sha256');


// configuration ==============================================
var config = require('./config/config.js');

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


var dict = JSON.parse( fs.readFileSync(config.dictFilePath, 'utf8') );

// handlebars ===================================================

app.engine('hbs', require('hbs').__express); //handlebars engine
require('./app/handlebars.js')(hbs);
hbs.registerPartials('./public/views/partials/');

// socket.io ====================================================

var makeTx = function (string) {
	var hash = SHA256(string);
	var chunks = _.chunk(hash.toString(), 8);
	//convert chunk arrays to hex formatted strings
	var hexints = _.map(chunks, function (arr) { 
			return _.reduce(arr, function (o, c, n) {
			 	if(n == 1) { 
			 		return '0x' + o + c; 
			 	} 
			 	return o + c; 
			 }); 
		});
	//convert hex formatted strings to a word
	var word = _(_.map(hexints, function (hs) {
	 return String.fromCharCode((parseInt(hs)%26)+97); 
	})).reduce( function (o, c, n) {
	 	if(n < string.length) {
	  		return o + c; 
		} else {
			return o;
		} 
	});
	return word;
};

io.on('connection', function (socket) {
	console.log("a user connected");
	
	socket.on('disconnect', function () {
		console.log("a user disconnected")
	});
	
	socket.on('change', function (string) {
		//tokenize string
		var tokens = _.words( string );
		//for each token
		var txs = [];
		for(var i = 0; i != tokens.length; i++){
			//if available, get translation from json, else make a new translation
			if( !_.has(dict, tokens[i]) ){
				dict[tokens[i]] = makeTx(tokens[i]);	
			}
			console.log(dict[tokens[i]]);
			txs[i] = dict[tokens[i]]; 
		}
		//write updated dictionary to json
		var jsonDict = JSON.stringify(dict);
		fs.writeFile(config.dictFilePath, jsonDict, function (err) {
			if (err) {
				console.log(err);
			} else {
				console.log("updated dictionary");
			}
		});
		//add translation to output string
		var tx = _.reduce(txs, function (output, word) { return output + " " + word; });
			
		//emit 'translation' event with output string
		socket.emit('tx', tx);
	});

});

// routes =======================================================

require('./app/routes.js')(app); //load routes

// run ==========================================================

http.listen(port);
console.log("shalish-translator launched on port " + port);