import fetch from 'cross-fetch'
import actors from '../CONSOLID/userConfigs/duplex.json'
import { generateFetch } from '../../src/auth'
import { prepare } from '../CONSOLID/createProject'

const bob = {
    email: "bob@example.org",
    password: "test123",
    idp: "http://localhost:3000",
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
        },
        method: "POST",
        body: urlencoded
    }
    
    const {token} = await actor.fetch(actor.consolid + "sign", options).then(i => i.json())
    return token
}

async function getProject(actor) {
    const projects =  await actor.fetch(actor.consolid + "project").then(i => i.json())
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
    const response = await actor.fetch(ds, {method: "POST", body: raw, headers: {"Content-Type": "application/json"}}).then(i => i.json())
    return response[0].distribution
}

async function requestResourceWithPBAC(actor, vault, resource, certificates) {
    const {authFetch} = await generateFetch(actor.email, actor.password, actor.idp)
    const options = {
        headers:  {
            "PBAC": certificates.join(', ')
        },
        method: "GET"
    }
    const url = vault.consolid + "pbac" + `?resource=${resource}`
    const data = await authFetch(url, options).then(i => i.text())
    return data
}

async function createRule(actor, actors) {
    const ownerAuthorityUrl = await createExplicitAuthority(actor, actors.owner)
    const engineerAuthorityUrl = await createExplicitAuthority(actor, actors.engineer)
    console.log('ownerAuthorityUrl :>> ', ownerAuthorityUrl);
    console.log('engineerAuthorityUrl :>> ', engineerAuthorityUrl);
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
            "content-type": "application/json"
        },
        body: JSON.stringify({rule}),
        method: "POST"
    }

    return await actor.fetch(actor.consolid + 'rule', options).then(i => i.text())
}

async function createExplicitAuthority(actor, authority) {
    const data = {
        "type": "https://w3id.org/consolid#ExplicitAuthority",
        "webId": authority.webId
    }

    const options = {
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    return await actor.fetch(actor.consolid + 'authority', options).then(i => i.text())
}

async function createImplicitAuthority(actor, issuerRequirement) {
    const data = {
        "type": "https://w3id.org/consolid#ImplicitAuthority",
        "issuerRequirement": issuerRequirement
    }

    const options = {
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    return await actor.fetch(actor.consolid + 'authority', options).then(i => i.text())
}

async function createRequirement(actor, requirement) {
    const urlencoded = new URLSearchParams();
    urlencoded.append("requirement", requirement);

    const options = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        body: urlencoded
    }
    
    return await actor.fetch(actor.consolid + "requirement", options).then(i => i.text())
}

async function addAuthorityToRequirement(actor, requirementUrl, authorityUri) {
    const reqId = requirementUrl.split('/').pop()
    const data = {
        "authorityURI": authorityUri
    }

    const options = {
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(data),
        method: "POST"
    }

    await actor.fetch(actor.consolid + `${reqId}/authority`, options)
    return
}

async function proceed(actors) {
    const {owner, architect, engineer} = actors
    // owner issues certificate to say that architect is part of the project
    const archCert = await issueCertificate(owner, statements(architect.webId, "duplex"))

    // architect issues certificate to say that bob is part of the project
    const bobCert = await issueCertificate(architect, statements(bob.webId, "duplex"))

    await createRule(engineer, actors)

    const projectUrl  = await getProject(architect)
    const resourceUrl = await get3Dsource(architect, projectUrl.split('/').pop())
    const data = await requestResourceWithPBAC(bob, engineer, resourceUrl, [archCert, bobCert])
    console.log('data :>> ', data);
    return "done"
}

prepare(actors).then(i=> proceed(actors)).then(console.log)