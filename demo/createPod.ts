import fetch from 'cross-fetch'
import { generateFetch } from '../src/auth'
import { sparqlUpdateViaRESTAPI } from './sparqlUpdate'
import { ACL, FOAF } from '@inrupt/vocab-common-rdf'
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
  actor.webId = `https://pod.werbrouck.me/${actor.name}/profile/card#me`
  actor.email = `${actor.name}@example.org`
  actor.sparqlSatellite = `https://sparql.werbrouck.me/${actor.name}/sparql`

  actor.inboxMail = `inbox_${actor.name}@example.org`
  actor.inbox = `https://pod.werbrouck.me/inbox_${actor.name}/`
  actor.inboxWebId = actor.inbox + 'profile/card#me'
  actor.inboxSparqlSatellite = `https://sparql.werbrouck.me/inbox_${actor.name}/sparql`
  actor.idp = "https://pod.werbrouck.me"

  const exists = await fetch(actor.webId, { method: 'HEAD' }).then(res => res.ok)
  if (!exists) {
    await createPod(actor)
  }

  const inboxExists = await fetch(actor.inbox, { method: 'HEAD' }).then(res => res.ok)
  if (!inboxExists) {
    await createPod(actor, "inbox")
  }

  const authFetch = await generateFetch(actor.email, actor.password, actor.idp)
  actor.fetch = authFetch

  if (!exists) {
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasSparqlSatellite> <${actor.sparqlSatellite}> }`, authFetch)
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasConSolidSatellite> <${actor.consolid}> }`, authFetch)
    await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <http://www.w3.org/ns/ldp#inbox> <${actor.inbox}> }`, authFetch)
  }

  if (!inboxExists) {
    const inboxFetch = await generateFetch(actor.inboxMail, actor.password, actor.idp)
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
  return actor
}