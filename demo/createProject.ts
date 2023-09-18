import { prepareFirstUse, wait } from "./createPod";
import { inviteToProject } from '../src/functions/notifications'
import { queryWithComunica } from "../src/functions/general";
import { QueryEngine } from "@comunica/query-sparql";
import { v4 } from 'uuid'

export async function prepare(actors) {
    for (const actor of Object.keys(actors)) {
        const a = await prepareFirstUse(actors[actor])
        actors[actor] = a
    }
    await wait(4000)
    return actors
}

export async function createProjectProtocol(actors, project, initiator) {

    // the owner creates a project in their Pod
    const projectUrl = await createProject(actors[initiator], project, [])

    // the architect notifies the others of the project by sending them a message
    for (const actor of Object.keys(actors)) {
        if (actor !== initiator) {
            await sendMessage(actors[initiator], actors[actor], projectUrl)
        }
    }

    // const projectUrl = "https://pod.werbrouck.me/owner-duplex/34e21bf5-1d7f-4d35-891b-21bdcdb7bfdd"

    // the others check their inbox and see the message
    for (const actor of Object.keys(actors)) {
        if (actor !== initiator) {
            const response: any = await getUnreadInvitations(actors[actor])
            // the others accept the invitation and create the project in their Pod, adding the one from the architect as a partial project
            const myEngine = new QueryEngine();
            const query = `prefix as: <https://www.w3.org/ns/activitystreams#> 
            prefix foaf: <http://xmlns.com/foaf/0.1/> 
            SELECT ?projectUrl WHERE {
                ?item foaf:primaryTopic <http://w3id.org/conSolid/ProjectCreation> ;
                    as:object ?projectUrl .
            }`

            const result = await myEngine.queryBindings(query, { sources: response, fetch: actors[actor].fetch });
            const data = await result.toArray().then(i => i.map((binding: any) => binding.get('projectUrl').id))

            if (data.length) {
                // set solid:read to true (and remove solid:read "false") via SPARQL patch update to the LDP resource related to the response
                const patch = `
            PREFIX solid: <http://www.w3.org/ns/solid/terms#>
            DELETE {
                <${response[0]}> solid:read false .
            }
            INSERT {
                <${response[0]}> solid:read true .
            } WHERE {
                <${response[0]}> solid:read false .
            }`

                await actors[actor].fetch(response[0], {
                    method: 'PATCH',
                    body: patch,
                    headers: {
                        'Content-Type': 'application/sparql-update'
                    }
                })

                // create the project
                const localUrl = await createProject(actors[actor], project, [data[0]])

                // the others notify the owner of their project creation
                await informOfAggregation(actors[actor], actors[initiator], localUrl, data[0])
            }

        }
    }


    // the owner checks their inbox and sees the message
    const response = await getUnreadAggregationMessages(actors[initiator])
    const ownerEngine = new QueryEngine()
    const query = `prefix as: <https://www.w3.org/ns/activitystreams#>
    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?message WHERE {
        ?announce a as:Announce ;
            as:object/rdf:value ?message .
    }`
    const result = await ownerEngine.queryBindings(query, { sources: response, fetch: actors[initiator].fetch });
    const data = await result.toArray().then(i => i.map((binding: any) => binding.get('message').id))
    for (const item of data) {
        const data = item.slice(1, -1)
        const parts = data.split(' ')
        const aggregatingProject = parts[0].slice(1, -1)
        const originalProject = parts[2].split("/")[parts[2].split("/").length -1].replace('>', '')
        await addStakeholder(actors[initiator], originalProject, aggregatingProject)
    }
}

async function addStakeholder(actor: any, projectId: string, aggregatingProject: string) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId, partialProjects: [aggregatingProject] })
    };
    const response = await actor.fetch(`${actor.consolid}project/${projectId}/aggregate`, requestOptions);
}

async function getUnreadInvitations(actor: any) {
    const config = {
        method: 'GET',
        headers: { "Content-Type": "application/json" }
    }
    const topic = encodeURI("http://w3id.org/conSolid/ProjectCreation")
    return await actor.fetch(actor.consolid + `inbox?unread=true&topic=${topic}`, config).then((res: any) => res.json())
}

async function getUnreadAggregationMessages(actor: any) {
    const config = {
        method: 'GET',
        headers: { "Content-Type": "application/json" }
    }
    const topic = encodeURI("http://w3id.org/conSolid/ProjectAggregation")
    return await actor.fetch(actor.consolid + `inbox?unread=true&topic=${topic}`, config).then((res: any) => res.json())
}

async function createProject(actor: any, projectName: string = v4(), partials: any[] = []) {
    const body = {
        "metadata": [
            {
                "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
                "object": projectName
            }
        ],
        "existingPartialProjects": partials
    }

    const config = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    }
    return await actor.fetch(actor.consolid + "project/create", config).then((res: any) => res.text())
}

async function informOfAggregation(sender: any, receiver: any, localUrl: string, remoteUrl: string) {
    const body = {
        "type": "projectAggregation",
        "to": receiver.webId,
        "localUrl": localUrl,
        "remoteUrl": remoteUrl
    }

    const config = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    }


    const info = await sender.fetch(sender.consolid + "send", config).then((res: any) => res.text())
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
        headers: { "Content-Type": "application/json" }
    }


    const info = await sender.fetch(sender.consolid + "send", config).then((res: any) => res.text())
}


