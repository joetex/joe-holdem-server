const http = require('http');
const { v4: uuidv4 } = require('uuid');

const defaultOptions = {
    host: 'localhost',
    port: '3000',
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

        this.games = options.games;
    }


    async newgame(options) {

        let id = uuidv4().replace(/\-/ig, '');

        options = options || {
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

        await this.doAction(id, 'newgame', options)
        return id;
    }

    async newround(id) {
        return await this.doAction(id, 'newround')
    }

    async playerjoin(id, name, chips, seat) {

        if (!name || name.length == 0)
            return false;

        chips = chips || 0;
        seat = seat || 0;

        let action = `playerjoin/${name}/${chips}/${seat}`;
        console.log(action);
        return await this.doAction(id, action);
    }

    async playerleave(id, name) {

        if (!name || name.length == 0)
            return false;

        let action = `playerleave/${name}`;
        console.log(action);
        return await this.doAction(id, action);
    }

    async doAction(id, action, game) {
        try {
            game = game || (await this.getGame(id));
            console.log(action, game);
            game = await this.httpPOST(action, game);
            await this.setGame(id, game);
        }
        catch (e) {
            console.error(e);
            return false;
        }
        return true;
    }


    async getGame(id) {
        if (this.onLoad)
            return this.onLoad(id);
        return this.games[id];
    }

    async setGame(id, game) {
        if (this.onSave)
            return this.onSave(id);
        console.log("saving:", game);
        this.games[id] = game;
    }

    async httpPOST(action, payload) {
        return new Promise((rs, rj) => {
            try {
                var options = {
                    host: this.host,
                    port: this.port,
                    protocol: this.protocol,
                    path: this.prefix + '/' + action,
                    method: 'POST',
                    headers: {}
                };

                if (this.apikey && this.apikey.length > 0)
                    options.headers['X-API-KEY'] = this.apikey;

                var req = http.request(options, response => {
                    var str = ''
                    response.on('data', chunk => { str += chunk });
                    response.on('end', () => {
                        try { rs(JSON.parse(str)); }
                        catch (e) { console.error(e); rj(e); }
                    });
                });

                console.log("payload", JSON.stringify(payload))
                req.write(JSON.stringify(payload));
                req.end();
            }
            catch (e) {
                console.error(e);
                rj(e);
            }
        })
    }
};
