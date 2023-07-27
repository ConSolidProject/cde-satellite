import { QueryEngine } from '@comunica/query-sparql'
import { queryWithComunica, querySparqlStore } from './general';
import { IDataSource, IQueryEngine, Bindings } from '@comunica/types';
import { DCAT, DCTERMS, RDF } from '@inrupt/vocab-common-rdf';
import { Catalog, CONSOLID, getRoot } from 'consolid-daapi';
import { ReferenceRegistry } from 'consolid-raapi';
import { v4 } from 'uuid';

async function getSparqlSatellite(webId: string) {
    if (webId === undefined) return undefined
    const myEngine = new QueryEngine()
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    SELECT * WHERE { <${webId}> consolid:hasSparqlSatellite ?sat }`
    const result: Bindings[] = await queryWithComunica(myEngine, query, [webId])
    if (result && result.length) {
        return result[0].get('sat')!.value
    } else {
        return undefined
    }
}

async function createProject(webId: string, existingPartialProjects: string[] = [], projectId: string = v4(), refRegId: string = v4()) {
    const root: string = webId.replace("profile/card#me", "")
    // 1. Create a catalog for the project
    const projectUrl = root + projectId
    const project: any = new Catalog(session, projectUrl)

    const metadata = [{
        predicate: RDF.type,
        object: CONSOLID.Project
    }, { predicate: DCTERMS.identifier, object: projectId }]

    await project.create(true, metadata)

    for (const existing of existingPartialProjects) {
        project.addDataset(existing)
    }

    // 3. create the reference registry of the local project
    const refRegUrl = root + refRegId
    const referenceRegistry = new ReferenceRegistry(session, refRegUrl)
    await referenceRegistry.create(project, true)

    return projectUrl
}

async function addDatasetToProject(projectUrl: string, datasetUrl?: string, file?: Express.Multer.File) {
    const root = getRoot(projectUrl)

    if (!datasetUrl) {
        datasetUrl = root + v4()
    }

    const dataset: any = new Catalog(session, datasetUrl)
    const date = new Date()
    const dsMetadata = [{
        predicate: DCTERMS.created,
        object: date.toISOString()
    }]

    await dataset.create(true, dsMetadata)

    if (file) {
        let mediaType = file.mimetype
        if (!mediaType) mediaType = "text/plain"
        const distMetadata = [{
            predicate: DCAT.mediaType,
            object: `https://www.iana.org/assignments/media-types/${mediaType}`
        }]
        const distUrl = await dataset.addDistribution(undefined, distMetadata)
        await dataset.dataService.writeFileToPod(file.buffer, distUrl, true, mediaType)
    }

    // register the dataset in the project
    const project: any = new Catalog(session, projectUrl)
    await project.addDataset(datasetUrl)
    return datasetUrl
}

// function to split url into root and id
function splitUrl(url: string) {
    const root = url.substring(0, url.lastIndexOf('/') + 1)
    const id = url.substring(url.lastIndexOf('/') + 1)
    return { root, id }
}

async function getConSolidProjectById(satellite: string, id: string) {
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    SELECT * WHERE { ?project <${DCTERMS.identifier}> "${id}" ; a consolid:Project ; <${DCAT.dataset}> ?dataset }`
    const result = await querySparqlStore(query, satellite)

    if (result && result.results.bindings.length) {
        const info = [
            { projectUrl: result.results.bindings[0].project.value, endpoint: satellite, accessPoint: true },
        ]
        for (const binding of result.results.bindings) {
            const projectUrl = binding.dataset.value
            const pod = session.info.webId.replace('profile/card#me', '')
            if (!projectUrl.includes(pod)) {
                let sat = await getSparqlSatellite(splitUrl(projectUrl).root + "profile/card#me")
                if (sat) {
                    info.push({ projectUrl, endpoint: sat, accessPoint: false })
                }
            }
        }
        return info
    } else {
        return undefined
    }
}

async function getAccessPointUrl(satellite: string, projectId: string) {
    return await getConSolidProjectById(satellite, projectId).then(res => res?.filter(p => p.accessPoint)[0].projectUrl)
}

async function getConSolidProjects(satellite: string) {
    const myEngine = new QueryEngine()
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    SELECT * WHERE { ?project a consolid:Project }`
    const result: Bindings[] = await queryWithComunica(myEngine, query, [{ type: "sparql", value: satellite }])
    if (result && result.length) {
        console.log('result :>> ', result[0].get('project')!.value);
        return result
    } else {
        return undefined
    }
}

async function addPartialProjectsToProject(projectUrl: string, partialProjects: string[]) {
    const project: any = new Catalog(session, projectUrl)
    for (const partialProject of partialProjects) {
        await project.addDataset(partialProject)
    }
}

async function findSolidLDNInbox(webId: string) {
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

async function postLDN(message: string, inbox: string, id: string) {
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

async function createNotification(sender: string, receiver: string, message: string, topic: string) {
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

    message.replace("<>", `<${inbox}/${id}/message>`)

    const content = `
    @prefix as: <https://www.w3.org/ns/activitystreams#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix oa: <http://www.w3.org/ns/oa#> .
    @prefix dcterms: <http://purl.org/dc/terms/> .
    @prefix consolid: <https://w3id.org/consolid#> .
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .

    <${inbox}/${id}>
      a as:Announce ;
      as:actor <${sender}> ;
      foaf:primaryTopic ${topic} .
      as:object <${inbox}/${id}/message> ;
      dcterms:created "${now.getDate()}"^^xsd:dateTime .
      
    ${message}`

    const response = await postLDN(content, inbox, id)
    return response
}

async function announceProjectAggregation(sender: string, receiver: string, source: string, partial: string) {
    const message = `
@prefix consolid: <https://w3id.org/consolid#> .
<> a consolid:ProjectAggregationEvent ;
    consolid:source <${source}> ;
    consolid:partial <${partial}> .`

    const topic = "http://w3id.org/conSolid/ProjectAggregation"
    const notification = await createNotification(sender, receiver, message, topic)
    return notification
}

async function announceAnnotation(sender: string, receiver: string, body: string, target: string) {
    const message = `
@prefix oa: <http://www.w3.org/ns/oa#> .
<> a oa:AnnotationEvent ;
    oa:hasBody <${body}> ;
    oa:hasTarget <${target}> .`

    const topic = "http://www.w3.org/ns/oa#Annotation"
    const notification = await createNotification(sender, receiver, message, topic)
    return notification
}

async function announceCollectionAggregation(sender: string, receiver: string, collection: string, alias: string) {
    const message = `
@prefix oa: <http://www.w3.org/ns/oa#> .
<> a consolid:CollectionAggregationEvent ;
    consolid:collection <${collection}> ;
    consolid:alias <${alias}> .`

    const topic = "http://www.w3.org/ns/oa#Annotation"
    const notification = await createNotification(sender, receiver, message, topic)
    return notification
}

export { getSparqlSatellite, getConSolidProjects, createProject, getConSolidProjectById, addDatasetToProject, getAccessPointUrl, addPartialProjectsToProject, findSolidLDNInbox }