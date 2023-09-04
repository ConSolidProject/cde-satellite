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
        console.log('existing :>> ', existing);
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

export { getSparqlSatellite, getConSolidProjects, createProject, getConSolidProjectById, addDatasetToProject, getAccessPointUrl, addPartialProjectsToProject }