const http = require('http');
const { v4: uuidv4 } = require('uuid');

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
module.exports = class StatelessHoldem {
    constructor(options) {
        options = Object.assign(options || {}, defaultOptions);

        this.host = options.host;
        this.port = options.port;
        this.protocol = options.protocol;
        this.prefix = options.prefix;
        this.apikey = options.apikey;

        this.onLoad = options.onLoad;
        this.onSave = options.onSave;

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
        return this.games[id];
    }

    async updateGame(id, game, changes) {
        if (this.onSave)
            return this.onSave(id);
        //console.log("saving:", game);

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

    async playerjoin(id, name, chips, seat) {

        if (!name || name.length == 0)
            return false;

        chips = chips || 0;
        seat = seat || 0;

        let action = `playerjoin/${name}/${chips}/${seat}`;
        return await this.action(id, action);
    }

    async playerleave(id, name) {

        if (!name || name.length == 0)
            return false;

        let action = `playerleave/${name}`;
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

            if (action == 'newgame')
                game = changes;
            else
                game = this.merge(changes, game);
            //console.log("game:", game);
            await this.updateGame(id, game, changes);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return game;
    }

    isObject(x) {
        return x != null && (typeof x === 'object' || typeof x === 'function') && !Array.isArray(x);
    }

    merge(from, to) {

        for (var key in from) {

            if (!(key in to)) {
                to[key] = from[key];
                continue;
            }

            if (Array.isArray(from[key])) {
                to[key] = from[key];
                continue;
            }
            if (this.isObject(from[key])) {
                to[key] = this.merge(from[key], to[key])
                continue;
            }

            to[key] = from[key];
        }

        return to;
    }




    printTotalSize() {
        console.log(this.totalSize);
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
};
