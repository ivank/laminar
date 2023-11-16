#!/usr/bin/env node

import { laminarCommand } from './commands/laminar';

laminarCommand().parse(process.argv);
