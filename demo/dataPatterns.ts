import { prepareFirstUse } from "./createPod";
import {inviteToProject} from '../src/functions/notifications'

const project = "duplex"
const actors = require(`./userConfigs/${project}.json`)

async function prepare() {
    for (const actor of Object.keys(actors)) {
        const a = await prepareFirstUse(actors[actor])
        actors[actor] = a
    }
}

async function createProjectProtocol() {
    // the architect creates a project in their Pod
    const projectUrl = await createProject(actors.architect)

    // the architect notifies the others of the project by sending them a message
    for (const actor of Object.keys(actors)) {
        if (actor !== 'architect') {
            await sendMessage(actors.architect, actors[actor], projectUrl)
        }
    }

    // the others check their inbox and see the message

    // the others accept the invitation and create the project in their Pod, adding the one from the architect as a partial project

    // the others notify the architect of their project creation

    // the architect includes the partial project from the others in their project

}

async function createProject(actor: any) {
    const body = {
        "metadata": [
            {
              "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
              "object": "Duplex"
            }
          ]
    }
    return await actor.fetch(actor.consolid + "project/create", {method: 'POST', body: JSON.stringify(body)}).then((res: any) => res.text())
}

async function sendMessage(sender: any, receiver: any, projectUrl: string) {
    const body = {
        "type": "projectInvite",
        "to": receiver.webId,
        "projectId": projectUrl
    }
    await sender.fetch(sender.consolid + "send", {method: 'POST', body: JSON.stringify(body)}).then((res: any) => res.text())
}

const now = new Date()
prepare()
// .then(createProjectProtocol)
.then(() => {
    console.log('duration: ', new Date().getTime() - now.getTime())
})