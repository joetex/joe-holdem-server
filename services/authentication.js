const { v4: uuidv4 } = require('uuid');


//use this class to implement a fancy authentication
class Authentication {
    constructor() {
        this.users = {};
    }

    generateAPIKey() {
        return uuidv4().replace(/\-/ig, '');
    }

    async checkLogin(request, response, next) {

        if (!request.session.authenticated) {
            //do login flow
            let passed = await this.loginUser(request, response);
            if (!passed) {
                console.log("User is not authenticated");
                response.json({ error: "E_INVALID_AUTH" });
                return;
            }
        }

        next();
    }

    //TODO: redirect user to login, must implement OIDC/Social login flow
    async loginUser(request, response) {
        let session = request.session;
        let apikey = this.generateAPIKey();

        let sessionid = request.sessionID;
        let playerid = this.generateAPIKey().substr(24);

        let user = this.users[apikey] || {};
        user.apikey = apikey;
        user.playerid = playerid;
        user.sessionid = sessionid;

        this.users[apikey] = user;
        session.user = user;

        return true;
    }

    async checkAPIKey(client, data) {
        if (!('X-API-KEY' in data)) {
            return false;
        }

        let apikey = data['X-API-KEY'];
        if (!(apikey in this.users)) {
            return false;
        }

        let user = this.users[apikey] || {};
        user.apikey = apikey;
        user.authenticated = true;
        user.clientid = client.id;
        this.users[apikey] = user;

        client.user = user;
        return true;
    }

    async getUserBySession(session) {
        return session.user;
    }
    async getUserByClient(client) {
        return client.user;
    }
    async getUser(apikey) {
        if (!(apikey in this.users))
            return null;
        return this.users[apikey];
    }
}

module.exports = new Authentication();