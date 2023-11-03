import { RDFS } from "@inrupt/vocab-common-rdf";
import { sparqlUpdateViaRESTAPI } from "./sparqlUpdate"
import fetch from 'cross-fetch'
import { v4 } from 'uuid'

async function querySparqlStore(query:string, endpoint: string, authfetch) {
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded,
    };

    const results = await authfetch(endpoint, requestOptions)
        .then(i => i.json())
        .catch((error: any) => {console.log('error :>> ', error);});
    return results
}

async function getReferenceRegistry(projectUrl, actor) {
    const projectId = projectUrl.split("/").pop()
    return await actor.fetch(actor.consolid +"project/" + projectId + "/referenceregistry", {method: 'GET', headers: { "Content-Type": "application/json" }}).then((res: any) => res.text()).catch(e => console.log('e :>> ', e))
}
 
async function getProject(actor) {
    return await actor.fetch(actor.consolid + "project", {method: 'GET', headers: { "Content-Type": "application/json" }}).then((res: any) => res.json())
}
 
async function findByMediaType(projectUrl, mediaType, actor, tag) {
    const projectId = projectUrl.split("/").pop()

    const body = {
        "distributionFilter": [
            {"predicate": "http://www.w3.org/ns/dcat#mediaType",
            "object": `https://www.iana.org/assignments/media-types/${mediaType}` }
        ],
        "datasetFilter": [
            {"predicate": RDFS.label,
            "object": tag }
        ]
    }
    var requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        redirect: 'follow'
      };
    
    const url = actor.consolid + "project/" + projectId + "/datasets"
    const data = await actor.fetch(url, requestOptions).then((res: any) => res.json())
    return data
}

async function findPairs(ttlUrl, actor) {
    const q = `
    PREFIX props: <https://w3id.org/props#>
    PREFIX schema: <http://schema.org/>
    SELECT ?ttl ?gltf 
    FROM <${ttlUrl}>
    WHERE {
        ?ttl props:globalIdIfcRoot_attribute_simple ?gltf
    }`

    const data = await querySparqlStore(q, actor.sparqlSatellite, actor.fetch)
    return data
}

export async function createAlignment(actors) {
    for (const a of Object.keys(actors)) {
        const actor = actors[a]
        if (actor.align) {
            const projectUrl = await getProject(actor).then(i => i[0])
            for (const tag of actor.tags) {
                console.log('tag :>> ', tag);
                const ttlUrl = await findByMediaType(projectUrl, "text/turtle", actor, tag).then(i => i.filter(data => {return data.distribution.includes(actor.name)}).map(i => i.distribution)[0])
                const gltfUrl = await findByMediaType(projectUrl, "model/gltf+json", actor, tag).then(i => i.filter(data => {return data.distribution.includes(actor.name)}).map(i => i.distribution)[0])
                 
                let pairs = await findPairs(ttlUrl, actor).then(i => i.results.bindings.map(j => ({ttl: j.ttl.value, gltf: j.gltf.value})))
                const refRegUrl = await getReferenceRegistry(projectUrl, actor)

                if (ttlUrl && gltfUrl && pairs && refRegUrl) {
                const prefixes = `
                PREFIX consolid: <https://w3id.org/consolid#>
                PREFIX oa: <http://www.w3.org/ns/oa#>
                PREFIX dct: <http://purl.org/dc/terms/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                `
                let updateStringTtl = prefixes + "INSERT DATA { "
                let updateStringGlTF = prefixes + "INSERT DATA { "
            
                for (const pair of pairs) {
                    const ttlC = refRegUrl + "#" + v4()
                    const ttlRef = refRegUrl + "#" + v4()
                    const ttlId = refRegUrl + "#" + v4()
            
                    let gltfC
                    if (refRegUrl === refRegUrl) {
                        gltfC = ttlC
                    } else {
                        gltfC = refRegUrl + "#" + v4()
                    }
                    const gltfRef = refRegUrl + "#" + v4()
                    const gltfId = refRegUrl + "#" + v4()
            
                    updateStringTtl += `<${ttlC}> a consolid:ReferenceCollection ;
                        consolid:aggregates <${ttlRef}> ${gltfC != ttlC ? `, <${gltfC}>` : ""}  .
                        <${ttlRef}> oa:hasSelector <${ttlId}> ;
                         dct:created "${new Date()}" ;
                            oa:hasSource  <${ttlUrl}> .
                        <${ttlId}> rdf:value "${pair.ttl}" .
                        `
            
                    updateStringGlTF += `<${gltfC}> a consolid:ReferenceCollection ;
                        consolid:aggregates <${gltfRef}> ${gltfC != ttlC ? `, <${ttlC}>` : ""} .
                        <${gltfRef}> oa:hasSelector <${gltfId}> ;
                         dct:created "${new Date()}" ;
                            oa:hasSource  <${gltfUrl}> .
                        <${gltfId}> rdf:value "${pair.gltf}" .`
                }
            
                updateStringGlTF += "}"
                updateStringTtl += "}"
                
                await sparqlUpdateViaRESTAPI(refRegUrl, updateStringTtl, actor.fetch)
                await sparqlUpdateViaRESTAPI(refRegUrl, updateStringGlTF, actor.fetch)
                }
            }
            
        }

    }
}