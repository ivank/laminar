import { init } from '@ovotech/laminar';
import { createApplication } from './application';
import { toEnvVars } from './env';

// << create
createApplication(toEnvVars(process.env), console)
  .then(init)
  .catch((error) => console.error(error));
// create
