const http = require('http');
import { v4 as uuidv4 } from 'uuid';

class StatelessHoldem {
    constructor(options) {
        this.host = options.host || 'localhost';
        this.port = options.port || '3000';
        this.prefix = options.prefix || 'api/v1/texasholdem';
        this.apikey = options.apikey || '';
        this.games = {};
    }

    loadgame(id) {
        return this.games[id];
    }

    savegame(id, game) {
        this.games[id] = game;
    }

    async newgame(params) {

        let id = uuidv4();

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

        params = await this.post('newgame', params);
        this.savegame(id, params);
    }


    async post(action, payload) {
        return new Promise((rs, rj) => {

            try {
                var options = {
                    host: this.host,
                    //since we are listening on a custom port, we need to specify it by hand
                    port: this.port,
                    //This is what changes the request to a POST request
                    method: 'POST',
                    headers: {
                    }
                };

                options.path = this.prefix + '/' + action;

                let callback = function (response) {
                    var str = ''
                    response.on('data', function (chunk) {
                        str += chunk;
                    });

                    response.on('end', function () {
                        try {
                            let json = JSON.parse(str);
                            rs(json);
                        }
                        catch (e) {
                            rj(e);
                        }
                    });
                }

                var req = http.request(options, callback);
                let jsonStr = JSON.stringify(payload);
                //This is the data we are posting, it needs to be a string or a buffer
                req.write(jsonStr);
                req.end();

            }
            catch (e) {
                console.error(e);
                rj(e);
            }

        })
    }
};

module.exports = new StatelessHoldem();