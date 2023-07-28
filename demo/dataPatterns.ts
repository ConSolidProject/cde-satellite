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
    // // the owner creates a project in their Pod
    // const projectUrl = await createProject(actors.owner)
    
    // // the architect notifies the others of the project by sending them a message
    // for (const actor of Object.keys(actors)) {
    //     if (actor !== 'owner') {
    //         await sendMessage(actors.owner, actors[actor], projectUrl)
    //     }
    // }

    const projectUrl = "https://pod.werbrouck.me/owner-duplex/34e21bf5-1d7f-4d35-891b-21bdcdb7bfdd"

    // the others check their inbox and see the message
    for (const actor of Object.keys(actors)) {
        if (actor !== 'owner') {
            const response = await getUnreadInvitations(actors[actor])
            console.log('response :>> ', JSON.stringify(response, null, 2));
        }
    }

    // the others accept the invitation and create the project in their Pod, adding the one from the architect as a partial project
 
    // the others notify the architect of their project creation

    // the architect includes the partial project from the others in their project

}

async function getUnreadInvitations(actor: any) {
    const config = {
        method: 'GET', 
        headers: {"Content-Type": "application/json"}
    }
    const topic = encodeURI("http://w3id.org/conSolid/ProjectCreation")
    return await actor.fetch(actor.consolid + `inbox?unread=true&topic=${topic}`, config).then((res: any) => res.json())
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

    const config = {
        method: 'POST', 
        body: JSON.stringify(body), 
        headers: {"Content-Type": "application/json"}
    }
    console.log('actor.fetch :>> ', actor.fetch);
    return await actor.fetch(actor.consolid + "project/create", config).then((res: any) => res.text())
}

async function sendMessage(sender: any, receiver: any, projectUrl: string) {
    const body = {
        "type": "projectInvite",
        "to": receiver.webId,
        "projectId": projectUrl
    }
    
    const config = {
        method: 'POST', 
        body: JSON.stringify(body), 
        headers: {"Content-Type": "application/json"}
    }


    const info = await sender.fetch(sender.consolid + "send", config).then((res: any) => res.text())
    console.log('info :>> ', info);
}


const now = new Date()
prepare() 
.then(createProjectProtocol)
.then(() => {
    console.log('duration: ', new Date().getTime() - now.getTime())
})