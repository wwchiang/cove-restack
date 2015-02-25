var express = require('express');
var mysql = require('mysql');

var app = express();

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database:'cove',
    port: 3306
});
conn.connect();

/*
// custom 404 page
app.use(function(req, res){
        res.type('text/plain');
        res.status(404);
        res.send('404 - Not Found');
});

// custom 500 page
app.use(function(err, req, res, next){
        console.error(err.stack);
        res.type('text/plain');
        res.status(500);
        res.send('500 - Server Error');
});
*/

app.listen(app.get('port'), function(){
  console.log( 'Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.' );
});

app.get('/data*',function(req, res){
	
	conn.query("SELECT c.data FROM `user_colonies` AS uc, `colonies` AS c WHERE uc.uid = " + req.query.uid.toString() + " and uc.cid = c.key", function(err,rows){
		if(err)
		{
			console.log("Problem with MySQL" + err);
		}
		else
		{
			res.end(JSON.stringify(rows[0]));
		}
	});
});

app.get('/hello',function(req, res){
			res.end('Hello world!');
});
