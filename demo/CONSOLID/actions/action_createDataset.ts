import { prepare } from "../createProject"
import {createDataset} from "../createDataset"

const project = "igent"
const actors = require(`../userConfigs/${project}.json`)

const now = new Date()
prepare(actors)
    .then((a) => createDataset(a))
    .then(() => {
        console.log('duration: ', new Date().getTime() - now.getTime())
    })
    .catch(err => console.log('err :>> ', err))