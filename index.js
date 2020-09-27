const StatelessHoldem = require('./service');

const holdem = new StatelessHoldem();

async function run() {
    let params;
    let id = await holdem.newgame();
    //console.log(id);
    await holdem.playerjoin(id, 'Joel', 100)

    await holdem.playerjoin(id, 'Tim', 100)
    await holdem.playerjoin(id, 'Bob', 100)
    await holdem.newround(id);

    //await holdem.doAction(id, 'bet/2');
    // await holdem.doAction(id, 'bet/4');
    // await holdem.doAction(id, 'call');
    // await holdem.doAction(id, 'call');

    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');

    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');

    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');
    // await holdem.doAction(id, 'check');


    // params = await holdem.getGame(id);
    // console.log(params);
}

console.time('Test Stateless took:');
run();
console.timeEnd('Test Stateless took:');