import { jsonOk, init, start, stop, run, HttpService, Service } from '@laminarjs/laminar';

// << Service
class MyService implements Service {
  constructor(private name: string) {}

  async start(): Promise<this> {
    // DO startup things
    return this;
  }
  async stop(): Promise<this> {
    // DO teardown things
    return this;
  }
  describe(): string {
    return this.name;
  }
}

const db = new MyService('db');
const events = new MyService('events');
const dataCat = new MyService('data-cat');
const http = new HttpService({ listener: async () => jsonOk({ success: true }) });

// Service

async function main() {
  // << start-stop
  await start({ initOrder: [db, events, dataCat], logger: console });
  await stop({ initOrder: [db, events, dataCat], logger: console });
  // start-stop

  // << run
  await run({ initOrder: [db, events, dataCat], logger: console }, async () => {
    console.log('Test out app');
  });
  // run

  // << init
  await init({ initOrder: [[db, events, dataCat], http], logger: console });
  // init
}

main();
