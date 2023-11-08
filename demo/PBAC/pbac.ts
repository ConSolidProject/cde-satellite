import fetch from 'cross-fetch'
const owner = {
    consolid: "http://localhost:5001/",
    webId: "http://localhost:3000/owner-duplex/profile/card#me",
    token: `Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkVvaFZCMWp1NEpHWVAwa0xiYjZsSWt6MUhFQVI5UTY0WU1kdGFQNkNsS2sifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9vd25lci1kdXBsZXgvcHJvZmlsZS9jYXJkI21lIiwianRpIjoiT0ZCU2ZJaW56Mk1WZk5xNGZlTi04Iiwic3ViIjoiZGVtb19iMWQzZDIwYS0yYTU4LTRmYzktYjhmNi1lOWFhYjhkNWJlYTciLCJpYXQiOjE2OTkzNjMxMTMsImV4cCI6MTY5OTk2MzExMywic2NvcGUiOiJ3ZWJpZCIsImNsaWVudF9pZCI6ImRlbW9fYjFkM2QyMGEtMmE1OC00ZmM5LWI4ZjYtZTlhYWI4ZDViZWE3IiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwLyIsImF1ZCI6InNvbGlkIn0.6EPJlnPmM94b0nonq8JEyJlKGvZ0B9-ONs_4NfVaB5UvK20DQS_mm9HJ03zD8QxUA6kC_Pr9sM5cocobM_zA2w`
}

const architect = {
    consolid: "http://localhost:5002/",
    webId: "http://localhost:3000/architect-duplex/profile/card#me",
    token: `eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkVvaFZCMWp1NEpHWVAwa0xiYjZsSWt6MUhFQVI5UTY0WU1kdGFQNkNsS2sifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hcmNoaXRlY3QtZHVwbGV4L3Byb2ZpbGUvY2FyZCNtZSIsImp0aSI6Ik0wS3Jwb0xFbC1mZGpoMW9DUGJzdyIsInN1YiI6ImRlbW9fMGViOTYxMGMtZDUxMy00MGZhLWEwM2UtYmI5ODk2YTlmNmU0IiwiaWF0IjoxNjk5MzYzMDkyLCJleHAiOjE2OTk5NjMwOTIsInNjb3BlIjoid2ViaWQiLCJjbGllbnRfaWQiOiJkZW1vXzBlYjk2MTBjLWQ1MTMtNDBmYS1hMDNlLWJiOTg5NmE5ZjZlNCIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC8iLCJhdWQiOiJzb2xpZCJ9.tWFEpOqRvXE-VOknIl3DOkEcxv9P9dbYUAwOrgmY7FfYu7_81Pj-FvVxsWcEyj-E00f3MMjSlbwxhWdNfprgug`
}

const engineer = {
    consolid: "http://localhost:5003/",
    webId: "http://localhost:3000/engineer-duplex/profile/card#me",
    token: `Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkVvaFZCMWp1NEpHWVAwa0xiYjZsSWt6MUhFQVI5UTY0WU1kdGFQNkNsS2sifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9lbmdpbmVlci1kdXBsZXgvcHJvZmlsZS9jYXJkI21lIiwianRpIjoicWpza0t6Y2Q4MnVMS05TYXlHZjNIIiwic3ViIjoiZGVtb182ODRhNGQxNy01NWM5LTQ5OTUtODQwMy04ZjllODgyMjk0YTEiLCJpYXQiOjE2OTkzNjMwNjksImV4cCI6MTY5OTk2MzA2OSwic2NvcGUiOiJ3ZWJpZCIsImNsaWVudF9pZCI6ImRlbW9fNjg0YTRkMTctNTVjOS00OTk1LTg0MDMtOGY5ZTg4MjI5NGExIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwLyIsImF1ZCI6InNvbGlkIn0.MtaKH_yutn79v6Gwwz_Hojs8skwi23RBDlR82GOQt3fYADh9k8gwENloTfVHB7_2agJO2HN-nJnlqChX_rUvvg`
}

const bob = {
    webId: "http://localhost:3000/bob/profile/card#me",
    token: "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkVvaFZCMWp1NEpHWVAwa0xiYjZsSWt6MUhFQVI5UTY0WU1kdGFQNkNsS2sifQ.eyJ3ZWJpZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9ib2IvcHJvZmlsZS9jYXJkI21lIiwianRpIjoiUXJMTWI2SU1GeTN3RVFKUjRIZ013Iiwic3ViIjoiZGVtb19lYTdkYzIyNC02MDY0LTQwYjItYjQ4My1mYzg2YmE4MGYyNzEiLCJpYXQiOjE2OTkzNjMxMzYsImV4cCI6MTY5OTk2MzEzNiwic2NvcGUiOiJ3ZWJpZCIsImNsaWVudF9pZCI6ImRlbW9fZWE3ZGMyMjQtNjA2NC00MGIyLWI0ODMtZmM4NmJhODBmMjcxIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwLyIsImF1ZCI6InNvbGlkIn0.9jtAq5mZLr3MS4GtB0c9YbSKNhEfKOIodan3uHaVl7X3nhYDpkwrle_q7tYCAaZsu6U3kPYSMVpSzgHBpk1CUw"
}

const ruleTemplate = (visitorRequirement, resourceRequirement) => `
@prefix pbac: <https://w3id.org/pbac#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<> a pbac:DynamicRule;
    acl:mode acl:Read ;
    rdfs:comment "Allows employees of offices that participate in the project to READ the resources of interest.";
    pbac:visitorRequirement <${visitorRequirement}> ;
    pbac:resourceRequirement <${resourceRequirement}> .`

const agentRequirementTemplate = (authority, projectId) => `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix pbac: <https://w3id.org/pbac#> .
@prefix consolid: <https://w3id.org/consolid#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
<> a sh:NodeShape, pbac:VisitorRequirement, pbac:IssuerRequirement ;
    sh:targetClass pbac:Visitor, pbac:Issuer ;
    pbac:hasTrustedAuthority <${authority}> ;
    sh:property [
        sh:path ( consolid:participatesIn dcterms:identifier );
        # an agreed-upon identifier for the project, only used for validation
        sh:hasValue "${projectId}" ;
    ] .
`

const resourceRequirementTemplate = (projectId) =>  `
@prefix pbac: <https://w3id.org/pbac#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
<> a pbac:ResourceRequirement ;
    rdfs:comment "The resource must be a dataset or distribution in the project with ID ${projectId}" ;
    pbac:askQuery """PREFIX dcat: <http://www.w3.org/ns/dcat#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    ASK WHERE {
    {
        ?project dcat:dataset+ $resource$ ;
            rdfs:label "${projectId}" .
    } UNION {
        ?project rdfs:label "${projectId}" ;
            dcat:dataset+/dcat:distribution/dcat:accessURL $resource$ .
    }}""" .`

const statements = (webId, label) => `
    @prefix consolid: <https://w3id.org/consolid#> .
    @prefix dcterms: <http://purl.org/dc/terms/> .
    <${webId}> consolid:participatesIn [
        dcterms:identifier "${label}"
    ] .`

async function issueCertificate(actor, statements) {
    const urlencoded = new URLSearchParams();
    urlencoded.append("message", statements);
    const options = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `${actor.token}`
        },
        method: "POST",
        body: urlencoded
    }
    
    const {token} = await fetch(actor.consolid + "sign", options).then(i => i.json())
    return token
}

async function getProject(actor) {
    const projects =  await fetch(actor.consolid + "project", {headers: {"Authorization": actor.token}}).then(i => i.json())
    return projects[0]
}

async function get3Dsource(actor, projectId) {
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
    const response = await fetch(ds, {method: "POST", body: raw, headers: {"Content-Type": "application/json", "Authorization": actor.token}}).then(i => i.json())
    return response[0].distribution
}

async function requestResourceWithPBAC(actor, vault, resource, certificates) {
    const options = {
        headers:  {
            "Authorization": actor.token,
            "PBAC": certificates.join(',')
        },
        method: "GET"
    }
    const url = vault.consolid + "pbac" + `?resource=${resource}`
    const data = await fetch(url, options).then(i => i.text())
    return data
}

async function createRule(actor) {
    const ownerAuthorityUrl = await createExplicitAuthority(actor, owner)
    const engineerAuthorityUrl = await createExplicitAuthority(actor, engineer)

    const agentRequirement = agentRequirementTemplate(ownerAuthorityUrl, "duplex")
    const agentRequirementUrl = await createRequirement(actor, agentRequirement)

    const implicitAuthorityUrl = await createImplicitAuthority(actor, agentRequirementUrl)
    console.log('implicitAuthorityUrl :>> ', implicitAuthorityUrl);
    const resourceRequirement = resourceRequirementTemplate("duplex")
    console.log('resourceRequirement :>> ', resourceRequirement);
    const resourceRequirementUrl = await createRequirement(actor, resourceRequirement)
    console.log('resourceRequirementUrl :>> ', resourceRequirementUrl);
    const rule = ruleTemplate(agentRequirementUrl, resourceRequirementUrl)
    const ruleUrl = await postRule(actor, rule)
    await addAuthorityToRequirement(actor, agentRequirementUrl, engineerAuthorityUrl)
    await addAuthorityToRequirement(actor, agentRequirementUrl, implicitAuthorityUrl)
    console.log('ruleUrl :>> ', ruleUrl);
}

async function postRule(actor, rule) {
    const options = {
        headers: {
            "authorization": actor.token,
            "content-type": "application/json"
        },
        body: JSON.stringify({rule}),
        method: "POST"
    }

    return await fetch(actor.consolid + 'rule', options).then(i => i.text())
}

async function createExplicitAuthority(actor, authority) {
    const data = {
        "type": "https://w3id.org/consolid#ExplicitAuthority",
        "webId": authority.webId
    }

    const options = {
        headers: {
            "authorization": actor.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    return await fetch(actor.consolid + 'authority', options).then(i => i.text())
}

async function createImplicitAuthority(actor, issuerRequirement) {
    const data = {
        "type": "https://w3id.org/consolid#ImplicitAuthority",
        "issuerRequirement": issuerRequirement
    }

    const options = {
        headers: {
            "authorization": actor.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    return await fetch(actor.consolid + 'authority', options).then(i => i.text())
}

async function createRequirement(actor, requirement) {
    const urlencoded = new URLSearchParams();
    urlencoded.append("requirement", requirement);

    const options = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": actor.token
        },
        method: "POST",
        body: urlencoded
    }
    
    return await fetch(actor.consolid + "requirement", options).then(i => i.text())
}

async function addAuthorityToRequirement(actor, requirementUrl, authorityUri) {
    const reqId = requirementUrl.split('/').pop()
    const data = {
        "authorityURI": authorityUri
    }

    const options = {
        headers: {
            "authorization": actor.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    await fetch(actor.consolid + `${reqId}/authority`, options)
    return
}

async function proceed() {

    // owner issues certificate to say that architect is part of the project
    const archCert = await issueCertificate(owner, statements(architect.webId, "duplex"))

    // architect issues certificate to say that bob is part of the project
    const bobCert = await issueCertificate(architect, statements(bob.webId, "duplex"))

    console.log('archCert :>> ', archCert);
    console.log('bobCert :>> ', bobCert);

    await createRule(engineer)

    const projectUrl  = await getProject(architect)
    const resourceUrl = await get3Dsource(architect, projectUrl.split('/').pop())
    const data = await requestResourceWithPBAC(bob, engineer, resourceUrl, [archCert, bobCert])
    return "done"
}

proceed().then(console.log)