import { createProjectProtocol, prepare } from "../createProject"
import { wait } from "../createPod"

const project = "igent"
const initiator = "owner"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })