import { QueryEngine } from '@comunica/query-sparql'
import { queryWithComunica } from './general';
import {  Bindings } from '@comunica/types';
import { v4 } from 'uuid';
import { getSparqlSatellite } from './consolid';

export async function findSolidLDNInbox(webId: string) {
    const myEngine = new QueryEngine()
    const query = `
    prefix ldp: <http://www.w3.org/ns/ldp#> 
    SELECT * WHERE { <${webId}> ldp:inbox ?inbox }`
    const result: Bindings[] = await queryWithComunica(myEngine, query, [webId])
    if (result && result.length) {
        return result[0].get('inbox')!.value
    } else {
        return undefined
    }
}

export async function postLDN(message: string, inbox: string, id: string) {
    const response = await fetch(inbox, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/turtle',
            'Slug': id,
            'Link': '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
        },
        body: JSON.stringify(message)
    })
    return response
}

export async function createNotification(sender: string, receiver: string, message: string, messageType: string = "triplePattern", description: string, topic: string) {
    const id = v4()
    const inbox = await findSolidLDNInbox(receiver)

    if (!inbox) {
        throw new Error('No inbox found for receiver')
    }

    let t
    if (topic.startsWith('http')) {
        t = `<${topic}>`
    } else {
        t = `"${topic}"`
    }
    const now = new Date()

    let m, messageContent
    if (messageType.toLowerCase() === "url") {
        m = message
        messageContent = ""
    } else {
        m = `<${inbox}/${id}#message>`
        message.replace("<>", `<${inbox}/${id}#message>`)
        messageContent = message
    }
    const content = `
    @prefix as: <https://www.w3.org/ns/activitystreams#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix oa: <http://www.w3.org/ns/oa#> .
    @prefix dcterms: <http://purl.org/dc/terms/> .
    @prefix consolid: <https://w3id.org/consolid#> .
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .
    @prefix solid: <http://www.w3.org/ns/solid/terms#> .

    <${inbox}/${id}> a as:Announce ;
      as:actor <${sender}> ;
      foaf:primaryTopic ${topic} .
      dcterms:description "${description}" ;
      as:object <${m}> ;
      dcterms:created "${now.getDate()}"^^xsd:dateTime ;
      solid:read "false" .
      
    ${message}`

    const response = await postLDN(content, inbox, id)
    return response
}

export async function announceAnnotationCreation(sender: string, receiver: string, body: string, target: string) {
    const message = `
@prefix oa: <http://www.w3.org/ns/oa#> .
<> a oa:AnnotationEvent ;
    oa:hasBody <${body}> ;
    oa:hasTarget <${target}> .`

    const description = `Someone has annotated one of your resources. Create backlink?`	

    const topic = "http://w3id.org/conSolid/AnnotationCreation"
    const notification = await createNotification(sender, receiver, message, "triplePattern", description, topic)
    return notification
}

export async function announceCollectionAggregation(sender: string, receiver: string, collection: string, alias: string) {
    const message = `
@prefix oa: <http://www.w3.org/ns/oa#> .
<> a consolid:CollectionAggregationEvent ;
    consolid:collection <${collection}> ;
    consolid:alias <${alias}> .`

    const description = `One of your Reference Collections has been aggregated by an external Reference Collection. Create backlink?`	

    const topic = "http://w3id.org/conSolid/CollectionAggregation"
    const notification = await createNotification(sender, receiver, message, "triplePattern", description, topic)
    return notification
}

export async function inviteToProject(sender: string, receiver: string, projectUrl: string) {
    const message = projectUrl
    const description = `You are invited to join the project with url: '${projectUrl}'.`	
    const topic = "http://w3id.org/conSolid/ProjectCreation"

    const notification = await createNotification(sender, receiver, message, "url", description, topic)
    return notification
}

export async function queryInbox(webId: string, query: string) {
    const inbox = await findSolidLDNInbox(webId)
    if (!inbox) {
        throw new Error('No inbox found for receiver')
    }
    const satellite = await getSparqlSatellite(inbox)
    if (!satellite) {
        throw new Error('No satellite found for inbox')
    }
    const myEngine = new QueryEngine()
    const result: Bindings[] = await queryWithComunica(myEngine, query, [{ type: "sparql", value: satellite }])
    return result
}

export async function findPendingNotificationsByTopic(webId: string, topic: string) {
    const query = `
SELECT ?notification ?p ?o WHERE {
    ?notification solid:read "false" ;
    foaf:primaryTopic <${topic}> .
}`
    const results = queryInbox(webId, query)
    return results
}

export async function findAllPendingNotifications(webId: string) {
    const query = `
SELECT ?sender ?p ?o WHERE {
    ?notification solid:read "false" ;
    ?p ?o .
}`
    const results = queryInbox(webId, query)
    return results
}

export async function markNotificationAsRead(notificationUrl: string) {
    const query = `
    DELETE {<${notificationUrl}> solid:read "false" .}
    INSERT {<${notificationUrl}> solid:read "true" .}
    WHERE {<${notificationUrl}> solid:read "false" .}`

    const response = await fetch(notificationUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/sparql-update'
        },
        body: query
    })
    return response
}
