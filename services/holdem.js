const http = require('http');
const { v4: uuidv4 } = require('uuid');
const authentication = require('./authentication');
const helper = require('./helper');

const defaultOptions = {
    host: 'localhost',
    port: '8000',
    protocol: 'http:',
    prefix: '/api/v1/texasholdem',
    apikey: '',
    onLoad: null,
    onSave: null,
    games: {}
}
module.exports = class Holdem {
    constructor(options) {
        options = Object.assign(options || {}, defaultOptions);

        this.host = options.host;
        this.port = options.port;
        this.protocol = options.protocol;
        this.prefix = options.prefix;
        this.apikey = options.apikey;

        this.onLoad = options.onLoad;
        this.onSave = options.onSave;

        this.clients = {};
        this.players = {};

        this.startedGames = options.startedGames || {};
        this.games = options.games || {};

        this.changes = options.changes || {};

        this.totalSize = 0;
    }

    async findwinner(params) {

        let id = uuidv4().replace(/\-/ig, '');
        await this.action(id, 'findwinner', params)
        return id;
    }

    async newgame(params) {

        let id = uuidv4().replace(/\-/ig, '');

        params = params || {
            "rules": {
                "deck": {
                    "decks": 1,
                    "jokers": 2,
                    "type": "standard52"
                },
                "game": {
                    "name": "Texas Holdem",
                    "seatCount": 10
                }
            }
        };

        params.id = id;
        let newParams = await this.action(id, 'newgame', params)
        let game = await this.getGame(id);
        return game;
    }
    async getGame(id) {
        if (this.onLoad)
            return this.onLoad(id);
        if (!this.games[id])
            throw { error: "E_INVALID_GAME" };
        return this.games[id];
    }



    async updateGame(id, game, changes) {
        if (this.onSave)
            return this.onSave(id);
        //console.log("saving:", game);

        game = helper.merge(changes, game);

        this.games[id] = game;
        this.changes[id] = changes || {};
        return game;
    }

    async listgames() {
        let gamelist = {};
        for (var id in this.games) {
            let game = this.games[id];
            let players = Object.keys(game.state.players);
            gamelist[id] = {
                id,
                players,
                rules: { ...game.rules }
            }
        }

        return gamelist;
    }

    async getplayer(id, name) {
        let game = await this.getGame(id);
        return game.state.players[name];
    }

    async newround(id) {
        return await this.action(id, 'newround')
    }



    async clientconnected(client) {
        console.log("Client connected");
        try {
            this.registerClient(client);
            this.requestAuthentication(client);
            return client;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }

    async clientdisconnected(client, reason) {
        console.log("Client disconnected [reason: " + reason + "]", client.id);
        this.unregisterClient();
    }

    async requestAuthentication(client) {
        console.log("requestAuthentication");
        try {
            client.authenticated = false;
            client.on('authenticate', data => { this.onauthenticate(client, data) });
            client.emit("connected", { connected: true, authenticated: false })
            return true;
        }
        catch (e) {
            console.error(e);
            throw { error: "E_INVALID_AUTHENTICATION" };
        }

        return false;
    }

    async onauthenticate(client, data) {
        console.log("onauthentication");
        if (!await authentication.checkAPIKey(client, data)) {
            //client.emit("invalid auth", data);
            return false;
        }

        let apikey = client.apikey;
        let player = await authentication.getUser(apikey);
        let playerid = player.playerid;

        this.players[playerid] = player;

        client.emit('authenticated', { playerid, apikey, connected: true, authenticated: true });

        client.on('action', data => { this.onaction(client, data) });
        client.on('playerjoin', data => { this.onplayerjoin(client, data) });
        client.on('disconnect', (data) => this.clientdisconnected(client, data));
        client.on('ready', (data) => { this.onclientready(client, data) });
    }

    async onclientready(client, data) {
        client.user.ready = data.ready;
        let game = await this.getGame(data.gameid);
        let changes = { state: { players: { [client.user.playerid]: { ready: data.ready } } } };
        await this.updateGame(game.id, game, changes);
        this.notifyAll('ready', game.id);
    }

    getGamePlayerIds(game) {
        if (!game || !game.state || !game.state.players)
            return [];
        return Object.keys(game.state.players);
    }

    notifyAll(eventName, gameid, skip) {
        let changes = this.changes[gameid];
        this.getGamePlayerIds(changes).forEach(playerid => {
            if (skip.includes(playerid))
                return;

            let player = this.players[playerid];
            let client = this.clients[player.clientid];
            if (!client)
                return;

            let cleanedGame = this.cleanParamsForPlayer(changes, playerid);
            cleanedGame.id = gameid;
            client.emit('event', { event: eventName, game: cleanedGame });
        })
    }

    async onplayerjoin(client, data) {
        let user = await authentication.getUser(client.apikey);
        let playerid = user.playerid;
        this.players[playerid] = user;

        console.log("Player Join:", data)
        try {
            let game = await this.playerjoin(data.gameid, playerid, 1000);
            let cleanedGame = this.cleanParamsForPlayer(game, playerid);
            client.emit('onJoinGame', cleanedGame);
            this.notifyAll('onPlayerJoin', game.id, [playerid]);
        }
        catch (e) {
            console.error(e);
            client.emit('onError', e);
        }
    }

    async playerjoin(id, playerid, chips, seat) {
        try {
            if (!playerid || playerid.length == 0)
                return false;

            let game = await this.getGame(id);
            if (playerid in game.state.players) {
                return game;
            }
            chips = chips || 0;
            seat = seat || 0;

            let action = `playerjoin/${playerid}/${chips}/${seat}`;
            return await this.action(id, action);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }

    async playerleave(id, playerid) {
        if (!playerid || playerid.length == 0)
            return false;

        let action = `playerleave/${playerid}`;
        return await this.action(id, action);
    }

    async action(id, action, game) {
        try {
            game = game || (await this.getGame(id));
            //console.log(action, game);

            if (action == 'newround') {
                if (game['winners'])
                    delete game['winners']
                if (game['hands'])
                    delete game['hands']
            }

            let changes = await this.httpPOST(action, game);
            //console.log("changes:\n", JSON.stringify(changes));

            // if (action == 'newgame')
            //     game = changes;
            // else
            //     game = helper.merge(changes, game);
            //console.log("game:", game);
            await this.updateGame(id, game, changes);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return game;
    }

    registerClient(client) {
        this.clients[client.id] = { client };

    }

    unregisterClient(client) {
        if (client && client.id && this.clients[client.id])
            delete this.clients[client.id];
    }

    getClient(id) {
        if (!(this.clients[id]))
            return null;
        return this.clients[id];
    }


    async httpPOST(action, payload) {
        var self = this;
        return new Promise((rs, rj) => {
            try {
                payload = JSON.stringify(payload);
                //payload = Buffer.from(payload, 'utf8');
                var options = {
                    host: this.host,
                    port: this.port,
                    protocol: this.protocol,
                    path: this.prefix + '/' + action,
                    method: 'POST',
                    headers: {
                        'Content-Length': Buffer.byteLength(payload),
                        'Content-Type': 'application/json'
                    }
                };

                if (this.apikey && this.apikey.length > 0)
                    options.headers['X-API-KEY'] = this.apikey;

                var req = http.request(options, response => {
                    var str = ''
                    //console.log(JSON.stringify(response.headers));
                    response.setEncoding('utf8');
                    response.on('data', chunk => { str += chunk });
                    response.on('end', () => {
                        try {
                            self.totalSize += Buffer.byteLength(str)
                            let result = JSON.parse(str);
                            rs(result);
                        }
                        catch (e) { console.error(e); rj(e); }
                    });
                    response.on('error', (e) => {
                        console.error(e);
                        rj(e);
                    });
                });

                //console.log("payload size: " + Buffer.byteLength(payload), payload)
                req.write(payload);
                req.end();
            }
            catch (e) {
                console.error(e);
                rj(e);
            }
        })
    }

    cleanParamsForAll(game) {
        let copy = helper.clone(game);
        if (copy.state.deck)
            delete copy.state['deck'];
        if (copy.state.burned)
            delete copy.state['burned'];

        if (copy.state && copy.state.players)
            for (var playerid in copy.state.players) {
                let playerState = copy.state.players[playerid];
                let player = this.players[playerid];

                playerState.displayname = player.displayname;
                playerState.ready = player.ready;
            }
        return copy;
    }

    cleanParamsForPlayer(game, targetid) {

        let copy = helper.clone(game);
        if (copy.state.deck)
            delete copy.state['deck'];
        if (copy.state.burned)
            delete copy.state['burned'];

        if (copy.state && copy.state.players)
            for (var playerid in copy.state.players) {

                let playerState = copy.state.players[playerid];
                let player = this.players[playerid];

                playerState.displayname = player.displayname;
                playerState.ready = player.ready;

                //skip player who caused action
                if (playerid == targetid)
                    continue;

                delete copy.state.players[playerid]['cards'];
            }

        return copy;
    }
};
