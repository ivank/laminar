import { App, httpServer, jsonOk, start, describe } from '@ovotech/laminar';

// << app

/**
 * Returns the url path being accessed
 */
const app: App = ({ incommingMessage }) => jsonOk({ accessedUrl: incommingMessage.url });

// app

const main = async () => {
  const server = httpServer({ app });
  await start(server);
  console.log(describe(server));
};

main();
