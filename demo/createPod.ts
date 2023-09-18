import fetch from 'cross-fetch'
import { generateFetch } from '../src/auth'
import { sparqlUpdateViaRESTAPI } from './sparqlUpdate'
import { ACL, FOAF } from '@inrupt/vocab-common-rdf'
import fs from 'fs';
import crypto from 'crypto';

const domain = "http://localhost:3000"
const sparqlDomain = "http://localhost:3001"

export async function createPod(user: any, type: string = "person") {
  let name, email
  if (type === "person") {
    name = user.name,
      email = user.email
  } else if (type === "inbox") {
    name = `inbox_${user.name}`,
      email = user.inboxMail
  }

  const json = {
    podName: name,
    email: email,
    password: user.password,
    confirmPassword: user.password,
    createWebId: true,
    register: true,
    createPod: true
  };
  const result = await fetch(`${user.idp}/idp/register/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json)
  })
  return result
}

export async function prepareFirstUse(actor: any) {
  actor.webId = `${domain}/${actor.name}/profile/card#me`
  actor.email = `${actor.name}@example.org`
  actor.sparqlSatellite = `${sparqlDomain}/${actor.name}/sparql`

  actor.inboxMail = `inbox_${actor.name}@example.org`
  actor.inbox = `${domain}/inbox_${actor.name}/`
  actor.inboxWebId = actor.inbox + 'profile/card#me'
  actor.inboxSparqlSatellite = `${sparqlDomain}/inbox_${actor.name}/sparql`
  actor.idp = domain

  const exists = await fetch(actor.webId, { method: 'HEAD' }).then(res => res.ok)
  if (!exists) {
    await createPod(actor)
  }

  const inboxExists = await fetch(actor.inbox, { method: 'HEAD' }).then(res => res.ok)
  if (!inboxExists) {
    await createPod(actor, "inbox")
  }

  const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)
  actor.fetch = authFetch 

  if (!exists) {
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasSparqlSatellite> <${actor.sparqlSatellite}> }`, authFetch)
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasConSolidSatellite> <${actor.consolid}> }`, authFetch)
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <http://www.w3.org/ns/ldp#inbox> <${actor.inbox}> }`, authFetch)
    await makeRSAKeys(actor)
    await makeTokenFolder(actor)
  }

  if (!inboxExists) {
    const {authFetch: inboxFetch} = await generateFetch(actor.inboxMail, actor.password, actor.idp)
    await sparqlUpdateViaRESTAPI(actor.inboxWebId, `INSERT DATA { <${actor.inboxWebId}> <https://w3id.org/consolid#hasSparqlSatellite> <${actor.inboxSparqlSatellite}> }`, inboxFetch)

    let query = `
  DELETE DATA {
      <${actor.inbox}.acl#public> a <${ACL.Authorization}>;
      <${ACL.agentClass}> <${FOAF.Agent}>;
      <${ACL.accessTo}> <${actor.inbox}>;
      <${ACL.mode}> <${ACL.Read}>.
  }`

    await sparqlUpdateViaRESTAPI(`${actor.inbox}.acl`, query, inboxFetch)

    query = `
INSERT DATA { 
  <${actor.inbox}.acl#owner> <http://www.w3.org/ns/auth/acl#agent> <${actor.webId}> .
}`

    await sparqlUpdateViaRESTAPI(`${actor.inbox}.acl`, query, inboxFetch)
  }
  await waitUntilAvailable(actor.sparqlSatellite)
  await waitUntilAvailable(actor.inboxSparqlSatellite)
  
  return actor
}

async function makeTokenFolder(actor) {
  const tokenUrl = `${domain}/${actor.name}/tokens/.acl`
  const data = privateAclTemplate(actor.webId, tokenUrl)
  await actor.fetch(tokenUrl, {method: "PUT", body: data}).catch(console.log)
}

async function makeRSAKeys(actor) {


// Generate a new RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096, // Length of the key in bits
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Save the keys to files (optional)
const privateKeyUrl = `${domain}/${actor.name}/profile/privateKey.pem`
const publicKeyUrl = `${domain}/${actor.name}/profile/publicKey.pem`
const privateKeyAcl = `${domain}/${actor.name}/profile/privateKey.pem.acl`
const publicKeyAcl = `${domain}/${actor.name}/profile/publicKey.pem.acl`

await actor.fetch(privateKeyUrl, {method: "PUT", body: privateKey}).catch(console.log)
await actor.fetch(privateKeyAcl, {method: "PUT", body: privateAclTemplate(actor.webId, privateKeyUrl), headers:{"Content-Type": "text/turtle"}}).catch(console.log)
await actor.fetch(publicKeyUrl, {method: "PUT", body: publicKey}).catch(console.log)
await actor.fetch(publicKeyAcl, {method: "PUT", body: publicAclTemplate(actor.webId, publicKeyUrl), headers:{"Content-Type": "text/turtle"}}).catch(console.log)

await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasPublicKey> <${publicKeyUrl}> }`, actor.fetch)

return
}

const privateAclTemplate = (owner, url) => `
# ACL resource for the WebID profile document
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

# The owner has full access to the profile
<#owner>
    a acl:Authorization;
    acl:agent <${owner}>;
    acl:accessTo <${url}>;
    acl:mode acl:Read, acl:Write, acl:Control.
`

const publicAclTemplate = (owner, url) => `
# ACL resource for the WebID profile document
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

# The WebID profile is readable by the public.
# This is required for discovery and verification,
# e.g. when checking identity providers.
<#public>
    a acl:Authorization;
    acl:agentClass foaf:Agent;
    acl:accessTo <${url}>;
    acl:mode acl:Read.

# The owner has full access to the profile
<#owner>
    a acl:Authorization;
    acl:agent <${owner}>;
    acl:accessTo <${url}>;
    acl:mode acl:Read, acl:Write, acl:Control.
`

// wait until a url is available via a HEAD request
async function waitUntilAvailable(url: string) {
  let available = false
  while (!available) {
      await wait(1000)
      const response = await fetch(url, { method: 'HEAD' })
      available = response.status === 200
  }
  return true
}

// wait for 5 seconds
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
