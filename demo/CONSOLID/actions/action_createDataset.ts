import { prepare } from "../createProject"
import {createDataset} from "../createDataset"

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Arguments {
  userConfig: string; // Define the expected argument(s)
  // ... other arguments
}

const argv = yargs(hideBin(process.argv))
  .option('userConfig', {
    type: 'string',
    description: 'Which userConfig to use (e.g. if you have a userConfig called "duplex.json", you pass "duplex" here)',
  })
  .parseSync() as Arguments;

const project = argv.userConfig || "duplex"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then((a) => createDataset(a))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })
    .catch(err => console.log('err :>> ', err))