import { querySparqlStore } from "./general";

const {QueryEngine} = require('@comunica/query-sparql')
const jsonld = require('jsonld')
const N3 = require('n3')
const ttl2jsonld = require('@frogcat/ttl2jsonld').parse;

const { DataFactory } = N3;
const writer = new N3.Writer({ prefixes: { 
    consolid: 'https://w3id.org/consolid#',
    dcterms: 'http://purl.org/dc/terms/',
    ls: "https://standards.iso.org/iso/21597/-1/ed-1/en/Linkset#",
    ct: "https://standards.iso.org/iso/21597/-1/ed-1/en/Container#",
    oa: "http://www.w3.org/ns/oa#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
} });

const queryTemplate = (projectId) => {
    return `
    PREFIX ct: <https://standards.iso.org/iso/21597/-1/ed-1/en/Container#>
    PREFIX dcat: <http://www.w3.org/ns/dcat#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX xml: <http://www.w3.org/XML/1998/namespace>

    CONSTRUCT {
        ?index a ct:ContainerDescription;
            ct:containsDocument ?dUrl .
        ?dUrl a ct:InternalDocument
            ct:creationDate ?containerCreation ;
            ct:publishedBy <http://icddservice.org/> ; # the service
            ct:versionID "1" ;
            
    } WHERE {
    
      BIND("${new Date().toDateString()})"^^xml:dateTime as ?containerCreation) # now
      BIND("${projectId}" as ?projectId) #the project ID is known
      BIND(<urn:uuid:${projectId}> as ?index) # the IRI for the index.
      BIND(replace(str(?mt), str("https://www.iana.org/assignments/media-types/"), str("")) as ?format)
      
      ?project dcterms:identifier  ?projectId;
        dcat:dataset+ ?ds .
        
      ?ds dcterms:created ?creationDate ;
        rdfs:comment ?description ;
        rdfs:label ?label ;
        dcat:distribution ?dist .
    
      ?dist dcat:mediaType ?mt ;
        dcat:accessURL ?dUrl .
        
    }`
}

async function generateIndex(projectId, tokens, aggregator) {
    const query = queryTemplate(projectId)
    const raw = {
        query,
        tokens
    }
    const results = await session.fetch(aggregator, {headers: {"Content-Type": "application/json"}, body: JSON.stringify(raw), method: "POST"}).then(i=> i.text()).catch(console.log)  
    console.log('results :>> ', results);
    return results
}

async function generateLinks(sources, projectId, engine) {
    const query = queryTemplate(projectId)
    const index = await engine.queryQuads(query, { sources }).then((quadStream) => {resolveQuadStream(quadStream)})
    return index
}

function resolveQuadStream(quadStream) {
    return new Promise((resolve, reject) => {
        const quads = []
        quadStream.on('data', (quad) => {
          writer.addQuad(quad)
          console.log('quad :>> ', quad);
        });
        quadStream.on('end', (quad) => {
          writer.end((error, result) => resolve(result));
        });
        quadStream.on('error', (error) => {
            reject(error)
        });
    })
}

export {generateIndex} 