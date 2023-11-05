import { createProjectProtocol, prepare } from "../createProject"
import { wait } from "../createPod"

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Arguments {
  userConfig: string; // Define the expected argument(s)
  initiator: string; // ... other arguments
}

const argv = yargs(hideBin(process.argv))
  .option('userConfig', {
    type: 'string',
    description: 'Which userConfig to use (e.g. if you have a userConfig called "duplex.json", you pass "duplex" here)',
  })
  .option('initiator', {
    type: 'string',
    description: 'The actor initiating the project (e.g. "owner"))',
  })
  .parseSync() as Arguments;

const project = argv.userConfig || "duplex"
const initiator = argv.initiator || "owner"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then(a => createProjectProtocol(a, project,initiator))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })