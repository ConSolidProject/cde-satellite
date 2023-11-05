import {  prepare } from "../createProject"
import { addDamageRecord } from "../addDamageRecord"
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
    description: 'The actor creating the damage (e.g. "fm"))',
  })
  .parseSync() as Arguments;

const project = argv.userConfig || "duplex"
const initiator = argv.initiator || "fm"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare({[initiator] : actors[initiator]})
    .then(async (a) => {
        const projects = await getProjects(a[initiator])
        return {project: projects[0], actor: a[initiator]}
    })
    .then(a => addDamageRecord(a.actor, a.project))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })

async function getProjects(actor) {
    return await actor.fetch(actor.consolid + "project").then(i => i.json())
}