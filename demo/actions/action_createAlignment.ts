import { prepare } from "../createProject"
import { createAlignment } from "../createAlignment"
import { wait } from "../createPod"

const project = "duplex"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then(a => createAlignment(a))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })