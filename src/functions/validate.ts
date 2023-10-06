import { spawn } from 'child_process';
import { QueryEngine } from '@comunica/query-sparql';
import { querySparqlStore } from './general';
import { fetchAndMergeTurtleGraphs } from './rdfParser';
import validateTurtleCallback from "turtle-validator"

const { Readable } = require('stream');
async function validate(data, shapes) {


  const validator = new SHACLValidator(shapes)
  const r = await validator.validate(data)
  const report = r.results.map(i => {
    return {
      message: i.message, 
      path: i.path,
      severity: i.severity,
      sourceConstraintComponent: i.sourceConstraintComponent,
      sourceShape: i.sourceShape,
      focusNode: i.focusNode,
    }
  })
  return {conforms: r.conforms, report} 
}

function validateTurtle(turtleStream): Promise<any> {
  return new Promise((resolve, reject) => {
    validateTurtleCallback(turtleStream, (err, report) => {
      if (err) {resolve(err)}
      resolve(report)
    })
  })
}

async function loadTurtle(data: string) {
  // const stream = new StringReadableStream(data, {})  
  const parser = new ParserN3({ factory })
  return factory.dataset().import(parser.import(Readable.from(data)))
}

async function loadUrl(url) {
  const stream = await session.fetch(url).then(i => i.body)
  const parser = new ParserN3({ factory })
  return factory.dataset().import(parser.import(stream)) 
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




export {validate, loadTurtle, loadUrl, getShapeCollection, getShapeUrls, createShapeGraph, validateTurtle}