const StatelessHoldem = require('./service');

const holdem = new StatelessHoldem();

async function run() {
    let params;
    let id = await holdem.newgame();
    console.log(id);
    await holdem.playerjoin(id, 'Joel', 100)
    // params = await holdem.getGame(id);
    // console.log(params);
    //await holdem.playerjoin(id, 'Tim', 100)
    //await holdem.playerjoin(id, 'Bob', 100)
    //await holdem.newround(id);


}

run();