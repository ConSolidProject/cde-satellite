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
            ct:containsDocument ?dUrl ;
            ct:creationDate ?containerCreation ;
            ct:publishedBy <http://icddservice.org/> ; # the service
            ct:creator ?creator ;
            ct:versionID "1" .
        
        ?dist a ct:ExternalDocument ;
            ct:creationDate ?creationDate ;
            ct:name ?label ;
            ct:description ?description ;
            ct:format ?format .
            
    } WHERE {
    
      BIND("${new Date().toDateString()})"^^xml:dateTime as ?containerCreation) # now
      BIND("${projectId}" as ?projectId) #the project ID is known
      BIND(<urn:uuid:${projectId}> as ?index) # the IRI for the index.
      BIND(replace(str(?mt), str("https://www.iana.org/assignments/media-types/"), str("")) as ?format)
      
      ?project dcterms:identifier  ?projectId;
        dcat:dataset+ ?ds .
        
      ?ds dct:creator ?creator ;
        dcterms:creationDate ?creationDate ;
        rdfs:comment ?description ;
        rdfs:label ?label ;
        dcat:distribution ?dist .
    
      ?dist dcat:mediaType ?mt ;
        dcat:accessURL ?dUrl .
        
    }`
}


async function generateIndex(projectId, tokens) {
    const query = queryTemplate(projectId)
    console.log('query :>> ', query);
    const aggregator = "http://localhost:6001/sparql"
    const raw = {
        query,
        tokens
    }
    const results = await session.fetch(aggregator, {headers: {"Content-Type": "application/json"}, body: JSON.stringify(raw), method: "POST"}).catch(console.log).then(i=> i.text())  
    console.log('results :>> ', results);
    return results
}

export {generateIndex} 