import { createProjectProtocol, prepare } from "../createProject"
import { wait } from "../createPod"

const project = "duplex"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then(a => createProjectProtocol(a, project))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })