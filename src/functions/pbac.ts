import { verify } from "./signature"
import { translate } from "sparqlalgebrajs"
import { parse } from "@frogcat/ttl2jsonld"
import SHACLValidator from 'shacl-js'

const $rdf = require('rdflib'); // Assume rdflib.js is available


async function getRequirementsPBAC(endpoint, uri, mode, requester, pbacCredentials) {
    const tokens = pbacCredentials.split(", ")
    const certificates: any = []
    for (const token of tokens) {
        const verified = await verify(token)
        if (!verified) {
            throw new Error("could not verify credentials of issuer")
        }
        certificates.push(verified.payload)
    }

    const rules = await getRules(mode, endpoint)
    const applicableRules: any = {}
    for (const r of Object.keys(rules)) {
        const rule = rules[r]
        const hasApplicableResourceRequirement = await checkResourceRequirement(uri, rule, endpoint)
        if (hasApplicableResourceRequirement) {
            applicableRules[r] = rule
        }
    }

    // only the applicable rules need to be checked for visitor requirements
    const validRules: any = []
    const trustedAuthorities = await getExplicitAuthorities(endpoint)



    for (const r of Object.keys(applicableRules)) {
        const rule = applicableRules[r]

        const certificatesToCheck: any = []
        for (const authority of rule.visitorRequirement.authorities) {
            // check the authority of the visitor requirement
            if (authority.type === "explicit") {
                // this certificate is issued by an explicit authority
                certificates.forEach(i => {
                    if (i.issuer == authority.webId) {
                        certificatesToCheck.push(i)
                    }
                })
            } else if (authority.type === "implicit") {
                // which certificates were signed by a non-explicit authority?
                const implicitAuthorities = certificates.filter(i => !trustedAuthorities.includes(i.issuer)).map(i => i.issuer)
                // what do we know of this authority? =  all certificates that were signed by a trusted authority, with this authority as a subject
                for (const a of implicitAuthorities) {
                    const allInfo = certificates.filter(i => i.actor == a && trustedAuthorities.includes(i.issuer))
                    // check if the issuer is allowed to make this statement
                    for (const cert of allInfo) {
                        const issuerCanSay = await getShapes(cert.issuer, rule.rule, endpoint)
                        if (Object.keys(issuerCanSay).includes(authority.issuerRequirement)) {
                            const shape = issuerCanSay[authority.issuerRequirement]
                            const data = cert.message + `<${cert.actor}> a <https://w3id.org/pbac#Visitor> .`
                            const validation = await validate(data, shape, shape)
                            if (validation.conforms) {
                                // the statements by this implicit authority may be added to the certificates to check against the rule
                                certificates.filter(i => i.issuer == cert.actor).forEach(c => certificatesToCheck.push(c))
                            }
                        }
                    } 
                } 
            }
        }

        // check the union of the certificatesToCheck against the shape of the issuer requirement
        const shape = await getShapeContent(rule.visitorRequirement.url, endpoint)
        const data = await convertTTL([...certificatesToCheck.map(i => i.message), `<${requester}> a <https://w3id.org/pbac#Visitor> .`])
        const report = await validate(data, shape, rule.rule)
        if (report.conforms) {
            validRules.push(rule)
        }
    }

    const accessAllowed = validRules.length > 0
    return accessAllowed
}

async function doQuery(query, endpoint) {
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // "Authorization": `Basic ${Buffer.from(process.env.SPARQL_STORE_USERNAME + ":" + process.env.SPARQL_STORE_PW).toString('base64')}`
        },
        body: urlencoded,
    };

    const results = await session.fetch(endpoint, requestOptions)
    return results
}

// Helper function to validate explicit authority
const getExplicitAuthorities = async (satellite) => {
    const query = `SELECT DISTINCT ?webId WHERE {
              ?s <https://w3id.org/pbac#hasTrustedAuthority> ?authority .
              ?authority <http://purl.org/dc/terms/identifier> ?webId .
          }`
    const response = await doQuery(query, satellite).then(i => i.json())
    return response.results.bindings.map(i => i.webId.value)
};

// Helper function to validate explicit authority
const getShapes = async (auth, rule, endpoint) => {
    const query = `PREFIX sh: <http://www.w3.org/ns/shacl#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX acl: <http://www.w3.org/ns/auth/acl#>
      prefix pbac: <https://w3id.org/pbac#>
      prefix dcterms: <http://purl.org/dc/terms/>
      SELECT DISTINCT ?shape WHERE {
        <${rule}> a pbac:DynamicRule ;
        pbac:visitorRequirement ?shape .
        ?shape pbac:hasTrustedAuthority/dcterms:identifier "${auth}" .
      }`
    
    const shapeUrls = await doQuery(query, endpoint).then(i => i.json()).then(i => i.results.bindings.map(i => i.shape.value))
    const shapes = {}
    for (const shapeUrl of shapeUrls) {
        await session.fetch(shapeUrl).then(i => i.text()).then(i => shapes[shapeUrl] = i)
    }
    return shapes
};

function convertTTL(ttlStrings) {
    const store = $rdf.graph();
    const base = 'http://example.org/';
    const contentType = 'text/turtle';

    // Parse the Turtle string into a graph
    for (const ttlString of ttlStrings) {
        $rdf.parse(ttlString, store, base, contentType);
    }
    // Serialize the graph to Turtle without prefixes
    return new Promise((resolve, reject) => {
        $rdf.serialize(null, store, base, 'text/n3', (err, result) => {
            if (err) {
                reject(err);
            } else {

                resolve(result);
            }
        });
    });
}

async function checkResourceRequirement(uri, rule, endpoint) {
    const query = rule.resourceRequirement.askQuery.replaceAll("$resource$", `<${uri}>`)
    try {
        translate(query)
    } catch (error) {
        return { result: { boolean: false }, rule: rule.rule.value }
    }
    const result = await doQuery(query, endpoint).then(i => i.json())
    return result.boolean
}

async function getShapeContent(shapeUrl, endpoint) {
    const query = `
    PREFIX pbac: <https://w3id.org/pbac#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    CONSTRUCT {?s ?p ?o} WHERE {
      GRAPH <${shapeUrl}> {
        ?s ?p ?o
      }.
    }`

    const response = await doQuery(query, endpoint).then(i => i.text())
    if (!parse(response)["@graph"]) {
        return response
    } else {
        return undefined
    }
}

async function getRules(mode, endpoint) {
    const query = `PREFIX pbac: <https://w3id.org/pbac#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX acl: <http://www.w3.org/ns/auth/acl#>

    SELECT * WHERE {
     ?rule a pbac:DynamicRule ;
      acl:mode <${mode}> ;
      pbac:resourceRequirement ?rr ;
      pbac:visitorRequirement ?vr .
    ?rr pbac:askQuery ?askQuery .
    ?vr pbac:hasTrustedAuthority ?authority .
    ?authority ?p ?o .
    VALUES ?p { dcterms:identifier pbac:issuerRequirement }
    }`
    const response = await doQuery(query, endpoint).then(i => i.json())
    const rules = {}
    response.results.bindings.forEach(i => {
        let type, webId, issuerRequirement
        if (i.p.value === "https://w3id.org/pbac#issuerRequirement") {
            type = "implicit"
            issuerRequirement = i.o.value
        } else if (i.p.value === "http://purl.org/dc/terms/identifier") {
            type = "explicit"
            webId = i.o.value
        }

        if (rules[i.rule.value]) {
            rules[i.rule.value].visitorRequirement.authorities.push({ authority: i.authority.value, type, webId, issuerRequirement })
        } else {
            rules[i.rule.value] = { rule: i.rule.value, resourceRequirement: { url: i.rr.value, askQuery: i.askQuery.value }, visitorRequirement: { url: i.vr.value, authorities: [{ authority: i.authority.value, type, webId, issuerRequirement }] } }
        }
    })
    return rules
}

function validate(data, shapes, shapeUrl): any {
    var validator = new SHACLValidator();
    return new Promise((resolve, reject) => {
        try {
            validator.validate(data, "text/turtle", shapes, "text/turtle", function (e, report) {
                resolve({ conforms: report.conforms(), results: report.results(), url: shapeUrl })
            });
        } catch (error) {
            console.log('error :>> ', error);
            reject(error)
        }

    })
}


export { getRequirementsPBAC }