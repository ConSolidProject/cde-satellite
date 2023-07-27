import { create } from 'domain'
import { generateFetch } from '../src/auth'
import { createPod } from './createPod'
import { sparqlUpdateViaRESTAPI } from './sparqlUpdate'
import fetch from 'cross-fetch'

const actors: any = {
    "owner": {
        "name": "owner-duplex",
        "password": "test123",
        "sparqlSatellite": "https://sparql.werbrouck.me/owner/sparql",
        "resources": []
    },
    "architect":  {
        "name": "architect-duplex",
        "password": "test123",
        "resources": ["./resources/duplex.ttl"]
    },
    "fm": {
        "name": "fm-duplex",
        "password": "test123",
        "resources": ["./resources/crack.jpg"]

    },
    "engineer": {
        "name": "engineer-duplex",
        "password": "test123",
        "resources": ["./resources/duplex.gltf"]
    }
}

async function prepareFirstUse() {
    for (const actor of Object.keys(actors)) {
        actors[actor].webId = `https://pod.werbrouck.me/${actors[actor].name}/profile/card#me`
        actors[actor].email = `${actors[actor].name}@example.org`
        actors[actor].inboxMail = `inbox_${actors[actor].name}@example.org`
        actors[actor].inbox = `https://pod.werbrouck.me/inbox_${actors[actor].name}/`
        actors[actor].sparqlSatellite = `https://sparql.werbrouck.me/${actors[actor].name}/sparql`
        actors[actor].consolid = `http://localhost:500${actors[actor].name === "owner" ? 1 : actors[actor].name === "architect" ? 2 : actors[actor].name === "fm" ? 3 : 4}/`
        actors[actor].idp = "https://pod.werbrouck.me"

        const exists = await fetch(actors[actor].webId, { method: 'HEAD' }).then(res => res.ok)
        if (!exists) {
            await createPod(actors[actor])
        }

        const inboxExists = await fetch(actors[actor].inbox, { method: 'HEAD' }).then(res => res.ok)
        if (!inboxExists) {
            await createPod(actors[actor], "inbox")
        }

        const authFetch = await generateFetch(actors[actor].email, actors[actor].password, actors[actor].idp)
        actors[actor].fetch = authFetch

        await sparqlUpdateViaRESTAPI(actors[actor].webId, `INSERT DATA { <${actors[actor].webId}> <https://w3id.org/consolid#hasSparqlSatellite> <${actors[actor].sparqlSatellite}> }`, authFetch)
        await sparqlUpdateViaRESTAPI(actors[actor].webId, `INSERT DATA { <${actors[actor].webId}> <https://w3id.org/consolid#hasConSolidSatellite> <${actors[actor].consolid}> }`, authFetch)
        await sparqlUpdateViaRESTAPI(actors[actor].webId, `INSERT DATA { <${actors[actor].webId}> <http://www.w3.org/ns/ldp#inbox> <${actors[actor].inbox}> }`, authFetch)

        const inboxFetch = await generateFetch(actors[actor].inboxMail, actors[actor].password, actors[actor].idp)

        await sparqlUpdateViaRESTAPI(`${actors[actor].inbox}.acl`, `
        @prefix acl: <http://www.w3.org/ns/auth/acl#> .
        INSERT DATA { 
            <#owner> acl:agent <${actors[actor].webId}> , <${actors[actor].email}> .
        }
        DELETE DATA {
            a acl:Authorization;
            acl:agentClass foaf:Agent;
            acl:accessTo <./>;
            acl:mode acl:Read.

        }`, inboxFetch)
    }
}

async function run() {
    await prepareFirstUse()

}


const now = new Date()
run().then(() => {
    console.log('duration: ', new Date().getTime() - now.getTime())
})