import fetch from 'cross-fetch'
import { generateFetch } from '../src/auth'
import { sparqlUpdateViaRESTAPI } from './sparqlUpdate'

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
  actor.inboxMail = `inbox_${actor.name}@example.org`
  actor.inbox = `https://pod.werbrouck.me/inbox_${actor.name}/`
  actor.sparqlSatellite = `https://sparql.werbrouck.me/${actor.name}/sparql`
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

  await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasSparqlSatellite> <${actor.sparqlSatellite}> }`, authFetch)
  await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <https://w3id.org/consolid#hasConSolidSatellite> <${actor.consolid}> }`, authFetch)
  await sparqlUpdateViaRESTAPI(actor.webId, `INSERT DATA { <${actor.webId}> <http://www.w3.org/ns/ldp#inbox> <${actor.inbox}> }`, authFetch)

  const inboxFetch = await generateFetch(actor.inboxMail, actor.password, actor.idp)



  await sparqlUpdateViaRESTAPI(`${actor.inbox}.acl`, `
  prefix acl: <http://www.w3.org/ns/auth/acl#>
  prefix foaf: <http://xmlns.com/foaf/0.1/>
  DELETE DATA {
      <#public> a acl:Authorization;
      acl:agentClass foaf:Agent;
      acl:accessTo <./>;
      acl:mode acl:Read.

  }`, inboxFetch)

  await sparqlUpdateViaRESTAPI(`${actor.inbox}.acl`, `
  prefix acl: <http://www.w3.org/ns/auth/acl#>
  INSERT DATA { 
    <#owner> acl:agent <${actor.webId}> , <${actor.email}> .
}`, inboxFetch)

return actor
}