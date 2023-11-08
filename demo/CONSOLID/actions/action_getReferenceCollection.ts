import { createProjectProtocol, prepare } from "../createProject"
import fetch from "cross-fetch"
const {QueryEngine} = require("@comunica/query-sparql") 
const project = "duplex"
const initiator = "owner"
const actors = require(`../userConfigs/${project}.json`)
const crypto = require('crypto')

const source = "http://localhost:3000/fm-ugent/04791e8c-c20d-48fe-9438-86d17baf53db"
const value = "http://localhost:3000/fm-ugent/04791e8c-c20d-48fe-9438-86d17baf53db/pct:20,10,25,55/max/0/default"
const projectId = "5eaa1fc4-daa4-41f8-a799-bad53fe76564"
const consolidSatellite = "http://localhost:5007"

const token = "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6Ijh3aEVBZC04R0pGbDdNcnZWdTZOYTIzMUpWNmFYRDFhX2xiV0hHUHV1ZHcifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9mbS11Z2VudC9wcm9maWxlL2NhcmQjbWUiLCJqdGkiOiJkeUFhR2dSZURVNy1hbEJ5WjhZN2IiLCJzdWIiOiJkZW1vXzI5NDUxNWM5LTY4NGMtNDUwZS04MDY1LWYwZTFmMWEwMDBkMSIsImlhdCI6MTY5NzcxOTQxNiwiZXhwIjoxNjk4MzE5NDE2LCJzY29wZSI6IndlYmlkIiwiY2xpZW50X2lkIjoiZGVtb18yOTQ1MTVjOS02ODRjLTQ1MGUtODA2NS1mMGUxZjFhMDAwZDEiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAvIiwiYXVkIjoic29saWQifQ.aQEfaDaBuAxPpTm501T3_tGgad89MAuVlnXq2RcdUuZ4OmRxVDm2dqkE38J0oEuHpOz3qPF3L-xS03nTDSMpiA"
const myEngine = new QueryEngine()

async function getReferenceCollection() {
    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': token}
    }
    const url = `${consolidSatellite}/project/${projectId}`
    const project = await fetch(url, requestOptions)
    .then(response => response.json())

    const allRefRegs: string[] = []
    for (const c of project) {
        const localId = c.projectUrl.split('/').pop()
        const refRegUrl = c.consolid + `project/${localId}/referenceRegistry`
        const refReg = await fetch(refRegUrl, {headers: {"Authorization": token}}).then(i => i.text())
        allRefRegs.push(refReg)
    }

    return allRefRegs
}
 
async function cacher(referenceRegistries) {
    const startTime = new Date().getTime()
    await myEngine.query(`ASK WHERE { ?s ?p ?o }`, {sources: referenceRegistries})
    const duration = new Date().getTime() - startTime
    console.log('duration of ASK: ', duration)
    return referenceRegistries
}

async function findReference(registries) {
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
    const results = await myEngine.queryBindings(query, {sources: registries}).then(i => i.toArray())
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
    console.log('sorted :>> ', sorted);
    console.log('sorted :>> ', JSON.stringify(sorted, null, 2));
    const duration = new Date().getTime() - startTime
    return duration
}

async function run() {
    const now = new Date()
    const allDuration:any = []
    let sum = 0
    let total = 5
    
    for (let i = 0; i < total; i++) {
    const duration = await getReferenceCollection()
        .then(cacher)
        .then(findReference)
    allDuration.push(duration)
    sum += duration
    }
    console.log('allDuration :>> ', allDuration);
    const average = sum / total
    console.log('average :>> ', average);
}

run().then(() => console.log('done'))

