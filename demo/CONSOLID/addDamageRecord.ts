// In this script, the FM will create a damage record in their vault. This damage record will be linked as a representation of a new Reference Collection. A pixel zone in image `crack.jpg`, which was uploaded in the previous step, will also be indicated as a representation of this Reference Collection. This script mimicks a selection of the damaged element via a 3D interface, which displays the architectural model. This allows the Reference Collection to immediately aggregate the Reference Collection of which this 3D element is a representation, as a remote alias on the architect's vault. A request is send the architect's inbox, which will be used to also the Reference Collection, making bi-directional discovery possible. Note that this bi-directional aggregation step is not strictly necessary for discovery of Reference Collections when an RDF Aggregator is used (i.e. the union of the Reference Registries can be queried).

import {v4} from "uuid"
import {Catalog} from "consolid-daapi"
import { DCTERMS, DCAT, RDFS } from "@inrupt/vocab-common-rdf"
const crypto = require('crypto')

const {QueryEngine} = require("@comunica/query-sparql") 

const myEngine = new QueryEngine()
const architectureGltfIdentifier = "1hOSvn6df7F8_7GcBWlR72"

function getRoot(url) {
    return url.substring(0, url.lastIndexOf('/') + 1)
}

function getIdentifier(url) {
    return url.substring(url.lastIndexOf('/') + 1)
}

async function createDamageGraph(actor, projectUrl) {
    const root = getRoot(projectUrl)
    const dsUrl = root + v4()
    const distUrl = root + v4()

    const project = new Catalog(actor.session, projectUrl)
    const damageDs = new Catalog(actor.session, dsUrl)
    const date = new Date()
    const dsMetadata = [{
        predicate: DCTERMS.created,
        object: date.toISOString()
    }]
    const distMetadata = [{
        predicate: DCAT.mediaType,
        object: `https://www.iana.org/assignments/media-types/text/turtle`
    }]

    await damageDs.create(true, dsMetadata)
    await project.addDataset(dsUrl)
    await damageDs.addDistribution(distUrl, distMetadata)

    const damagedElementUri = distUrl + "#" + v4()
    const damageAreaUri = distUrl + "#" + v4()

    const data = `
    @prefix dot: <https://w3id.org/dot#> .
    <${damagedElementUri}> dot:hasDamageArea <${damageAreaUri}> .
    `

    await project.dataService.writeFileToPod(Buffer.from(data), distUrl, true, "text/turtle")

    return {distUrl, damagedElementUri, damageAreaUri, dsUrl}
}

async function get3Dsource(actor, projectUrl) {
    const projectId = getIdentifier(projectUrl)
      var raw = JSON.stringify({
        "distributionFilter": [
            {"predicate": "http://www.w3.org/ns/dcat#mediaType",
            "object": "https://www.iana.org/assignments/media-types/model/gltf+json" }
        ], 
        "datasetFilter": [
          {
            "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
            "object": "duplex_architecture"
          }
        ]
    });

    const ds = actor.consolid + `project/${projectId}/datasets`
    const response = await actor.session.fetch(ds, {method: "POST", body: raw, headers: {"Content-Type": "application/json"}}).then(i => i.json())
    return {source: response[0].distribution, identifier: architectureGltfIdentifier}
}

async function addDamageRecord(actor, projectUrl) {
    const projectId = getIdentifier(projectUrl)

      var raw = JSON.stringify({
        "datasetFilter": [
          {
            "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
            "object": "crack"
          }
        ]
      });

    const url = actor.consolid + `project/${projectId}/datasets`
    const response = await actor.session.fetch(url, {method: "POST", body: raw, headers: {"Content-Type": "application/json"}}).then(i => i.json())

    const reference = await createPixelZone(actor, projectUrl, response[0].distribution)
    const damageGraph = await createDamageGraph(actor, projectUrl)
    await linkDamageAndPicture(actor, projectUrl, reference.referenceCollection, damageGraph.distUrl, damageGraph.damagedElementUri)
    const registries = await getProjectReferenceCollections(actor, projectId)

    // alias finding
    const {source, identifier} = await get3Dsource(actor, projectUrl)
    const concept = await findReference(registries, source, identifier, actor.fetch)
    const alias = concept[Object.keys(concept)[0]].aliases[0]
    await add3DasAlias(actor, projectId, reference.referenceCollection, alias)

    // final test
    myEngine.invalidateHttpCache()
    const aggregatedConcept  = await findReference(registries, source, identifier, actor.fetch)
    console.log('aggregatedConcept :>> ', aggregatedConcept);
    return response
}

async function createPixelZone(actor, project, damagePicture) {
    const projectId = getIdentifier(project)
    const referenceRegistry = await actor.fetch(actor.consolid + `project/${projectId}/referenceregistry`).then(i => i.text())
    const refRegId = getIdentifier(referenceRegistry)

    const identifier =  `${damagePicture}/pct:20,10,25,55/max/0/default`
    const newReference = await actor.fetch(actor.consolid + `${refRegId}/reference`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            "conformsTo": "https://iiif.io/api/image/3.0/",
            "source": damagePicture,
            "identifier": identifier
        })
    }).then(i => i.json())
    return newReference
}

async function linkDamageAndPicture(actor, project, refCol, damageGraph, damagedElementUri) {
    const projectId = getIdentifier(project)
    const referenceRegistry = await actor.fetch(actor.consolid + `project/${projectId}/referenceregistry`).then(i => i.text())
    const refRegId = getIdentifier(referenceRegistry)

    const newReference = await actor.fetch(actor.consolid + `${refRegId}/reference`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            "referenceCollection": refCol,
            "conformsTo": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "source": damageGraph,
            "identifier": damagedElementUri
        })
    }).then(i => i.json())
    return newReference
}

async function getProjectReferenceCollections(actor, projectId) {
    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json'}
    }
    const url = `${actor.consolid}project/${projectId}`
    const project = await actor.fetch(url, requestOptions).then(response => response.json())
    const allRefRegs: string[] = []
    for (const c of project) {
        const localId = c.projectUrl.split('/').pop()
        const refRegUrl = c.consolid + `project/${localId}/referenceRegistry`
        const refReg = await fetch(refRegUrl).then(i => i.text())
        allRefRegs.push(refReg)
    }

    return allRefRegs
}

async function findReference(registries,source,value, fetch) {
    const query = `
    PREFIX consolid: <https://w3id.org/consolid#>
    PREFIX oa: <http://www.w3.org/ns/oa#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
        ?rc a consolid:ReferenceCollection ;
         consolid:aggregates+ ?ref, ?otherRef .
        ?ref oa:hasSource <${source}> ;
            oa:hasSelector/rdf:value "${value}".
        ?otherRef oa:hasSource ?otherSource ;
            oa:hasSelector/rdf:value ?otherValue .

        OPTIONAL {?rc consolid:aggregates ?alias .
        ?alias a consolid:ReferenceCollection }
    }`

    const startTime = new Date().getTime()
    const results = await myEngine.queryBindings(query, {sources: registries, fetch}).then(i => i.toArray())
    const concepts = {}
    for (const r of results) {
        
        const concept = r.get('rc').value
        if (!Object.keys(concepts).includes(concept)) {
            concepts[concept] = {
                aliases: new Set(),
                references: new Set()
            }
            concepts[concept].aliases.add(concept)
        }
        if (r.get('alias')) {
            concepts[concept].aliases.add(r.get('alias').value)
        }

        if (r.get('otherSource') && r.get('otherValue')) {
            concepts[concept].references.add(r.get('otherSource').value + "_$$_" + r.get('otherValue').value)
        }
    }

    const sorted = {}
    Object.keys(concepts).forEach(c => {
        const aliasesSortedString = Array.from(concepts[c].aliases).sort().join(';')
        const hash = crypto.createHash('md5').update(aliasesSortedString).digest('hex')
        if (!Object.keys(sorted).includes(hash)) {
            sorted[hash] = {
                aliases: concepts[c].aliases,
                references: concepts[c].references
            }
        } else {
            sorted[hash].aliases.add(...concepts[c].aliases)
            sorted[hash].references.add(...concepts[c].references)
        }
    })

    for (const s of Object.keys(sorted)) {
        sorted[s].aliases = Array.from(sorted[s].aliases)
        sorted[s].references = Array.from(sorted[s].references).map((i:any) => {return {source: i.split('_$$_')[0], value: i.split('_$$_')[1]}})
    }
    return sorted
}

async function add3DasAlias(actor, project, referenceCollection, alias) {
    const projectId = getIdentifier(project)
    const referenceRegistry = await actor.fetch(actor.consolid + `project/${projectId}/referenceregistry`).then(i => i.text())
    const referenceId = getIdentifier(referenceRegistry)
    const url = actor.consolid + `${referenceId}/alias`
    return await actor.fetch(url, {body: JSON.stringify({referenceCollection, alias}), headers: {"Content-Type": "application/json"}, method: "POST"}).then(i => i.text())
}


export {addDamageRecord, createDamageGraph, createPixelZone, get3Dsource}