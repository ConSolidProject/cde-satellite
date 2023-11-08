import fetch from 'cross-fetch'
import SHACLValidator from 'shacl-js'
import { translate } from 'sparqlalgebrajs'
import { generateFetch } from '../../src/auth'
import {engineer, architect, owner} from '../CONSOLID/userConfigs/duplex.json'
import fs from 'fs'

async function get3Dsource(actor, projectId) {
  const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)

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
const response = await authFetch(ds, {method: "POST", body: raw, headers: {"Content-Type": "application/json"}}).then(i => i.json())
return response[0].distribution
}

async function getProjects(actor, fetch) {
  const projects = await fetch(actor.consolid + "project/").then(i => i.json())
  if (projects && projects.length) return projects
  else return []
}

async function generateCert(message, actor, about) {
  const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)
  const cert = await authFetch(actor.consolid + "sign", {
    method: "POST",
    body: JSON.stringify({message, about}),
    headers: {"Content-Type": "application/json"}
  }).then(i => i.json())
  return cert.token
}

async function run() {
  const cert1 = await generateCert(`
  @prefix consolid: <https://w3id.org/consolid#> .
  @prefix dcterms: <http://purl.org/dc/terms/> .
  <http://localhost:3000/bob/profile/card#me> consolid:participatesIn [
      dcterms:identifier "duplex"
  ] .`, architect, "http://localhost:3000/bob/profile/card#me") 

  const cert2 = await generateCert(`
  @prefix consolid: <https://w3id.org/consolid#> .
  @prefix dcterms: <http://purl.org/dc/terms/> .
  <http://localhost:3000/architect-duplex/profile/card#me> consolid:participatesIn [
      dcterms:identifier "duplex"
  ] .`, owner, "http://localhost:3000/architect-duplex/profile/card#me") 

  const actor = {
    email: "bob@example.org",
    password: "test123",
    idp: "http://localhost:3000"
  }
  const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)

  const projects = await getProjects(engineer, authFetch)
  const projectId = projects[0].split('/').pop()
  const url = await get3Dsource(engineer, projectId)

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