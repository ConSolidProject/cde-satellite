import { QueryEngine } from '@comunica/query-sparql'
import { queryWithComunica, querySparqlStore } from './general';
import { IDataSource, IQueryEngine, Bindings } from '@comunica/types';
import { DCAT, DCTERMS, RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { Catalog, getRoot } from 'consolid-daapi';
import CONSOLID from 'consolid-vocabulary';
import { ReferenceRegistry } from 'consolid-raapi';
import { v4 } from 'uuid';
import { createShapeGraph, getShapeUrls, loadTurtle, validate } from './validate';

const QueryEngineLTBQ = require('@comunica/query-sparql-link-traversal').QueryEngine;


async function getSatellites(webId: string) {
    const me = await fetch(webId, { headers: { "Accept": "application/ld+json" } }).then(res => res.json()).then(i => i.filter(i => i["@id"] === webId))
    const sparql = me[0]["https://w3id.org/consolid#hasSparqlSatellite"][0]["@id"]
    const consolid = me[0]["https://w3id.org/consolid#hasConSolidSatellite"] && me[0]["https://w3id.org/consolid#hasConSolidSatellite"][0]["@id"]
    return { sparql, consolid }
}
async function getService(projectUrl, standard) {
    const engine = new QueryEngine()
    const query = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
    SELECT ?endpoint WHERE {
        <${projectUrl}> dcat:service ?service .
        ?service dcat:endpointURL ?endpoint ;
            dcterms:conformsTo <${standard}> .
    }`
    const bindings = await engine.queryBindings(query, { sources: [projectUrl] }).then((result) => result.toArray())
    if (bindings.length > 0) {
        return bindings[0].get('endpoint')!.value
    }
}

async function createProject(webId: string, existingPartialProjects: string[] = [], projectId: string = v4(), refRegId: string = v4(), md: any[] = []) {
    const root: string = webId.replace("profile/card#me", "")
    // 1. Create a catalog for the project
    const projectUrl = root + projectId
    const project: any = new Catalog(session, projectUrl)

    const metadata = [...md, {
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

async function addDatasetToProject(projectData: any, datasetUrl?: string, file?: Express.Multer.File, datasetMeta?, distMeta?) {

    const type = "http://www.w3.org/ns/dcat#Dataset"
    const projectUrl = projectData.filter(i => i.accessPoint)[0].projectUrl

    const shapeUrls = await getShapeUrls(projectData, type)
    const shapeGraph = await createShapeGraph(shapeUrls)

    const root = getRoot(projectUrl)
    if (!datasetUrl) {
        datasetUrl = root + v4()
    }

    // check for dataset shapes in the project
    
    const dataset: any = new Catalog(session, datasetUrl)
    const date = new Date()
    const dsMetadata = [...datasetMeta, {
        predicate: DCTERMS.created,
        object: date.toISOString()
    }, {
        predicate: DCTERMS.identifier,
        object: datasetUrl.split('/').pop()
    }]
 
    if (file) {
        dsMetadata.push({
            predicate: RDFS.label,
            object: file.originalname.split('.')[0]
        })
    }

    let dataGraph =`
    @prefix dcat: <http://www.w3.org/ns/dcat#> .
    <> a dcat:Catalog, dcat:Dataset .
  `;

  for (const triple of dsMetadata) {
    let o;
    if (triple.object.startsWith("http")) {
      o = `<${triple.object}>`;
    } else {
      o = `"${triple.object}"`;
    }

    dataGraph += `<> <${triple.predicate}> ${o} .`;
  }

    const shapes = await loadTurtle(shapeGraph)
    const data = await loadTurtle(dataGraph)
    // validate against registered requirements
    const report = await validate(data, shapes)
    if (!report.conforms) {
        const violations = report.report.filter(i => i.severity.value === "http://www.w3.org/ns/shacl#Violation")
        if (violations.length) {
            return report
        }
    }

    // add the dataset to the project
    await dataset.create(true, dsMetadata)

    if (file) {
        let mediaType = file.mimetype
        if (!mediaType) mediaType = "text/plain"
        const distMetadata = [...distMeta, {
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

async function getConSolidProjectByIdLTBQ(webId, id: string) {
    const {sparql} = await getSatellites(webId)
    const thisProject = await getConSolidProjectById(sparql, id)
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    prefix dcat: <http://www.w3.org/ns/dcat#>
    SELECT * WHERE { 
        <${thisProject}> <${DCTERMS.identifier}> "${id}" ;
            a consolid:Project ; 
            dcat:dataset* ?dataset .
        ?dataset a consolid:Project .}`


    const myEngine = new QueryEngineLTBQ()
    const bindingsStream = await myEngine.queryBindings(query, {
        sources: [thisProject],
        lenient: true 
    })
    const bindings = await bindingsStream.toArray(); 
    const pod = process.env.WEBID!
    const project: any = [] 
    for (const binding of bindings) {
        let projectUrl = binding.get('dataset')!.value 
        let accessPoint, webId
        if (!projectUrl.includes(pod.replace("/profile/card#me", ""))) {
            webId = splitUrl(projectUrl).root + "profile/card#me"
            accessPoint = false
        } else {
            projectUrl = thisProject
            webId = pod
            accessPoint = true
        }
        const { sparql, consolid } = await getSatellites(webId) 
        project.push({ projectUrl, sparql, consolid, accessPoint, webId })
    }
    myEngine.invalidateHttpCache()
    return project
}

async function getConSolidProjectById(satellite: string, id: string) {
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    SELECT * WHERE { ?project <${DCTERMS.identifier}> "${id}" ; a consolid:Project .}`
    const result = await querySparqlStore(query, satellite)
    return result.results.bindings[0].project.value
}

async function getConSolidProjects(satellite: string) {
    const myEngine = new QueryEngine()
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    SELECT * WHERE { ?project a consolid:Project }`
    const result: Bindings[] = await queryWithComunica(myEngine, query, [{ type: "sparql", value: satellite }])
    if (result && result.length) {
        return result.map((binding: any) => binding.get('project')!.value)
    } else {
        return undefined
    }
}

async function addPartialProjectsToProject(projectUrl: string, partialProjects: string[]) {
    const project: any = new Catalog(session, projectUrl)
    console.log('projectUrl :>> ', projectUrl);
    console.log('partialProjects :>> ', partialProjects);
    for (const partialProject of partialProjects) {
        await project.addDataset(partialProject)
    }
}

async function getReferenceRegistry(satellite: string, projectUrl: string) {
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    prefix dcat: <http://www.w3.org/ns/dcat#> 
    SELECT * WHERE { 
        <${projectUrl}> dcat:dataset ?ds .
    ?ds a consolid:ReferenceRegistry; 
        dcat:distribution/dcat:accessURL ?dURL .
}`
    const result = await querySparqlStore(query, satellite)
    if (result && result.results.bindings.length) {
        return result.results.bindings[0].dURL.value
    }
    return undefined
}

async function updateResource(accessPoint, update) {
    var requestOptions = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/sparql-update',
          'Authorization': session.bearer,
        },
        body: update,
      };

      return await fetch(accessPoint, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
}

async function deleteResource(accessPoint) {
    var requestOptions = {
        method: 'DELETE',
        headers: {
          'Authorization': session.bearer,
        },
      };
  
      return await fetch(accessPoint, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
}

async function getProjectDatasets(project, filter) {
    const datasets = []
    for (const partial of project) {
        await getLocalDatasets(partial.projectUrl, partial.sparql, filter).then((data: []) => datasets.push(...data))
    }
    return datasets
}

async function getLocalDatasets(project, endpoint, filter) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': session.bearer,
        },
        body: JSON.stringify({project, ...filter})
    };

    const url = endpoint.replace('sparql', 'datasets')
    console.log('url :>> ', url);
    const data = await fetch(url, requestOptions).then(res => res.json())
    return data
}

async function deleteRecursively(project) {
    // find all datasets and their distributions
    const datasets = await getLocalDatasets(project.projectUrl, project.sparql, {})
    for (const item of datasets) {
        await deleteResource(item.distribution)
        await deleteResource(item.dataset)
    }
    const shapeCollection = await getShapeCollection(project.projectUrl, project.sparql)
    for (const item of shapeCollection) { 
        await deleteResource(item)
    }
    await deleteResource(project.projectUrl)
    return
}

async function getShapeCollection(projectUrl: string, satellite: string) {
    const query = `
    prefix consolid: <https://w3id.org/consolid#> 
    prefix dcat: <http://www.w3.org/ns/dcat#> 
    SELECT * WHERE { 
        <${projectUrl}> a consolid:Project; 
            consolid:hasShapeCollection ?shapeCollection .
    ?shapeCollection dcat:dataset ?shape .
    ?shape dcat:distribution/dcat:accessURL ?dURL .
}`
    const result = await querySparqlStore(query, satellite)
    const resources = new Set()
    if (result && result.results.bindings.length) {
        for (const r of result.results.bindings) {
            if (r.dURL) {
                resources.add(result.results.bindings[0].dURL.value)
            }
            if (r.shape) {
                resources.add(result.results.bindings[0].shape.value)
            }
            if (r.shapeCollection) {
                resources.add(result.results.bindings[0].shapeCollection.value)
            }
        }
    }
    return Array.from(resources)
}

async function getDatasetDistributions(satellite, datasetUrl) {
    const query = `
    prefix dcat: <http://www.w3.org/ns/dcat#>
    SELECT * WHERE { 
        <${datasetUrl}> dcat:distribution ?distribution .
    ?distribution dcat:accessURL ?dURL .
}`
    const result = await querySparqlStore(query, satellite)
    if (result && result.results.bindings.length) {
        return result.results.bindings.map((binding: any) => binding.dURL.value) 
    }
    return []
} 

function resolveId(id, owner) {
    return owner.replace("profile/card#me", "") + id
}

export {  
    getSatellites, 
    getConSolidProjects, 
    createProject, 
    getConSolidProjectById, 
    addDatasetToProject, 
    addPartialProjectsToProject, 
    getReferenceRegistry,
    updateResource, 
    deleteResource, 
    deleteRecursively, 
    getProjectDatasets,
    getLocalDatasets,
    getConSolidProjectByIdLTBQ,
    resolveId,
    getDatasetDistributions,
    getService
}