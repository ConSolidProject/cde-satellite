import { querySparqlStore } from "./general"
import { verify } from "./signature"
import { loadTurtle, loadUrl, validate } from "./validate"

async function getRequirementsPBAC(satellite, resource, mode, actor, pbacCredentials) {
    const verified = await verify(pbacCredentials)
    if (!verified) {
        throw new Error("could not verify credentials of issuer")
    }
    
    const authority = verified.payload.issuer

    const query = `PREFIX acl: <http://www.w3.org/ns/auth/acl#>
    prefix pbac: <https://w3id.org/pbac#>
    prefix dcterms: <http://purl.org/dc/terms/>
    SELECT * WHERE {
        ?rule a pbac:DynamicRule ;
            acl:mode acl:Read .
        OPTIONAL {
            ?rule pbac:visitorRequirement ?visitorRequirement .
            ?visitorRequirement a pbac:VisitorRequirement ;
                pbac:hasTrustedAuthority ?authority .
            ?authority a ?authorityType ;
                dcterms:identifier "${authority}".
        } .
        OPTIONAL {
            ?rule pbac:resourceRequirement ?resourceRequirement .
            ?resourceRequirement a pbac:ResourceRequirement ;
                pbac:askQuery ?askQuery .
        } .
    }`

    const results = await querySparqlStore(query, satellite)
    if (!results.results.bindings.length) {
        throw new Error("no rules found which trust the issuer of the credential")
    }
    const resourceResolutions = results.results.bindings.map((rule) => {
        return evaluateResource(resource, rule, satellite)
    })
    const applies = await Promise.all(resourceResolutions).then(i => i.filter(j => j.result.boolean === true)).then(i => i.length > 0)

    const statements = verified.payload.message + ` <${verified.payload.actor}> a <https://w3id.org/pbac#Visitor> .`
    const processedData = await loadTurtle(statements)

    
    const visitorRequirements = results.results.bindings.map((rule) => rule.visitorRequirement.value)
    let conforms = false
    for (const req of visitorRequirements) {
        const processedShape = await loadUrl(req)
        const result = await validate(processedData, processedShape)
        if (result.conforms) {
            conforms = true
            break;
        }
    }
    if (conforms && applies) {
        return await session.fetch(resource)
    } else { 
        throw new Error("requirements not met")
    }

}  

async function evaluateResource(resource, rule, satellite) { 
    const query = rule.askQuery.value.replaceAll("$resource$", `<${resource}>`) 
    const result = await querySparqlStore(query, satellite)
    return {result, rule: rule.rule.value}
} 

// async function evaluateVisitor(visitor, pbacCredentials, rule, satellite) {
//   // verify statement against visitorRequirement shapes
//   const statements = pbacCredentials.payload.message + ` <${pbacCredentials.payload.actor}> a <https://w3id.org/pbac#Visitor> .`
//   const processed = await loadTurtle(statements)
//   const shapes = 
// }

export { getRequirementsPBAC}