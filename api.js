const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http);

const port = 8080

const StatelessHoldem = require('./service');
const holdem = new StatelessHoldem();

function createAPI() {

    app.use(express.json())
    app.use(cors());

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

    io.on('connection', client => {
        client.on('event', data => { /* … */ });
        client.on('disconnect', () => { /* … */ });
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

