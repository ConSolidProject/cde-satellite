import fetch from 'cross-fetch'
import SHACLValidator from 'shacl-js'
import { translate } from 'sparqlalgebrajs'
import { generateFetch } from '../../src/auth'
import {engineer} from '../CONSOLID/userConfigs/duplex.json'
import fs from 'fs'
const cert1 = fs.readFileSync('./resources/architect-involved-in-duplex.txt', "utf-8")
const cert2 = fs.readFileSync('./resources/bob-involved-in-duplex.txt', "utf-8")


async function get3Dsource(actor, projectId, fetch) {
  var raw = JSON.stringify({
    "distributionFilter": [
        {"predicate": "http://www.w3.org/ns/dcat#mediaType",
        "object": "https://www.iana.org/assignments/media-types/model/gltf+json" }
    ], 
    "datasetFilter": [
      {
        "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
        "object": "duplex_hvac"
      }
    ]
});

const ds = actor.consolid + `project/${projectId}/datasets`
const response = await fetch(ds, {method: "POST", body: raw, headers: {"Content-Type": "application/json"}}).then(i => i.json())
return response[0].distribution
}

async function getProjects(actor, fetch) {
  const projects = await fetch(actor.consolid + "project/").then(i => i.json())
  if (projects && projects.length) return projects
  else return []
}

async function run() {
  const actor = {
    email: "bob@example.org",
    password: "test123",
    idp: "http://localhost:3000"
  }
  const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)

  const projects = await getProjects(engineer, authFetch)
  const projectId = projects[0].split('/').pop()
  const url = await get3Dsource(engineer, projectId, authFetch)

  var myHeaders = {"PBAC": `${cert1}, ${cert2}`}
  const options = {
    method: "GET",
    headers: myHeaders
  }

  const endpoint = engineer.consolid+`pbac?resource=${url}`
  console.log('endpoint :>> ', endpoint);
  const data = await authFetch(endpoint, options).then(i=> i.text())
  return data
}

run().then(console.log)