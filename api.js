const express = require('express');
const cors = require('cors');
const app = express()
var http = require('http').createServer(app);
const cookieParser = require('cookie-parser');
const session = require('express-session');
const port = 8080

const Holdem = require('./services/holdem');
const holdem = new Holdem();
const authentication = require('./services/authentication');

function createAPI() {

    app.use(cors({
        origin: [
            'http://localhost:3000', 'http://localhost:8080', 'http://localhost:8000', '*'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
        credentials: true
    }));

    app.use(session({
        secret: 'MYSECRETKEYHAHAHAH',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }))
    app.use(cookieParser());
    app.use(express.json());



    // app.all('*', function (request, response, next) {
    //     response.header("Access-Control-Allow-Origin", "*");
    //     response.header("Access-Control-Allow-Headers", "X-Requested-With");
    //     next();
    // });

    app.use((req, res, next) => authentication.checkLogin(req, res, next));

    app.get('/apikey', async (req, res) => {
        let apikey = req.session.apikey || 'INVALID';
        res.json({ apikey });
    })

    app.post('/creategame', async (req, res) => {
        let params = req.body;
        let newParams = await holdem.newgame(params);
        console.log(newParams);
        res.json(newParams);
    })

    app.post('/listgames', async (req, res) => {
        let gamelist = await holdem.listgames();
        console.log(gamelist);
        res.json(gamelist);
    })

    app.post('/joingame/:id', (req, res) => {
        res.send('Hello World!')
    })


    app.post('/playerjoin', (req, res) => {
        res.send('Hello World!')
    })

    app.post('/playerleave', (req, res) => {
        res.send('Hello World!')
    })


}



function createWebSockets() {
    var io = require('socket.io')(http, {
        cookie: true,
        transports: ['websocket', 'polling'],
        // cors: {
        //     origin: "*",
        //     methods: ["GET", "POST"],
        //     allowedHeaders: ["X-API-KEY"],
        //     credentials: true
        // },
        // origins: "*",
        // handlePreflightRequest: (req, res) => {
        //     res.writeHead(200, {
        //         "Access-Control-Allow-Origin": "*",
        //         "Access-Control-Allow-Methods": "GET,POST",
        //         "Access-Control-Allow-Headers": "X-API-KEY",
        //         "Access-Control-Allow-Credentials": true
        //     });
        //     res.end();
        // }
    });

    io.on('connection', client => {
        holdem.clientconnected(client);
    });

}

module.exports = function run() {
    createAPI();
    createWebSockets();

    http.listen(process.env.PORT || port, function () {
        var host = http.address().address
        var port = http.address().port
        console.log('App listening at http://%s:%s', host, port)
    });
}

