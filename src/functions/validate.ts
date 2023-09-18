import factory from 'rdf-ext'
import fs from 'fs'
import ParserN3 from '@rdfjs/parser-n3'
import SHACLValidator from 'rdf-validate-shacl'
import { spawn } from 'child_process';
import { QueryEngine } from '@comunica/query-sparql';
import { querySparqlStore } from './general';
import { fetchAndMergeTurtleGraphs } from './rdfParser';

function validate(rulebookPath, dataPath) {
  return new Promise((resolve, reject) => {
    let report = spawn("pyshacl", ["--shacl", rulebookPath ,"-m","-i","rdfs","-a","-j","-f","human",dataPath])

    report.stderr.on("data", data => {
      reject(data)
    });
    
    let r = ""
    report.stdout.on("data", data => {
      if (data.toString().includes("usage: pyshacl.exe")) {
        reject(data)
      }
      r += data
    });

    report.on("close", code => {
      resolve(r)
    });
  })
}

async function getShapeUrls(project: any[], type?: string) {
  const projectUrl = project.filter(i => i.accessPoint)[0].projectUrl

  let query = `prefix consolid: <https://w3id.org/consolid#>
    prefix dcat: <http://www.w3.org/ns/dcat#>
    prefix sh: <http://www.w3.org/ns/shacl#>

  SELECT ?shapeCollection WHERE {<${projectUrl}> consolid:hasShapeCollection ?shapeCollection . 
}`

    // GRAPH ?shapeUrl {
    //   ?shape a sh:NodeShape .`
    // if (type) {query += `?shape sh:targetClass <${type}> .` }
    // query += `}}`

  const myEngine = new QueryEngine()
  const bindingsStream = await myEngine.queryBindings(query, {
      sources: [projectUrl],
      fetch: session.fetch,
  })
  const shapeUrls: string[] = []
  const bindings = await bindingsStream.toArray();  
  if (bindings.length) {
    for (const b of bindings) {
      const url = b.get('shapeCollection')!.value
      const id: any = url.split("/").pop()
      const root = url.replace(id, "")
      const endpoint = project.filter(i => i.webId.includes(root))[0].sparql
      let shapeQuery = `prefix consolid: <https://w3id.org/consolid#>
      prefix dcat: <http://www.w3.org/ns/dcat#> 
      prefix sh: <http://www.w3.org/ns/shacl#>
      SELECT ?shapeUrl WHERE {
        <${url}> dcat:dataset+/dcat:distribution/dcat:accessURL ?shapeUrl .
        GRAPH ?shapeUrl {
          ?shape a sh:NodeShape .
          ${type ? `?shape sh:targetClass <${type}> .` : ""}
        }}`
        
        console.log('shapeQuery :>> ', shapeQuery);
      await querySparqlStore(shapeQuery, endpoint).then(i => i.results.bindings.forEach(i => shapeUrls.push(i.shapeUrl.value)))
      }
    } 
  
  return shapeUrls
}

async function createShapeGraph(shapeUrls: string[]) {
  const shapeGraph = await fetchAndMergeTurtleGraphs(shapeUrls)
  return shapeGraph
}

async function getShapeCollection(projectUrl: string) {
  const project = await fetch(projectUrl, { headers: { "Accept": "application/ld+json" } }).then(res => res.json()).then(i => i.filter(i => i["@id"] === projectUrl))
  const shapeCollection = project[0]["https://w3id.org/consolid#hasShapeCollection"] && project[0]["https://w3id.org/consolid#hasShapeCollection"][0]["@id"]
  return shapeCollection
}


export {validate, getShapeCollection, getShapeUrls, createShapeGraph}