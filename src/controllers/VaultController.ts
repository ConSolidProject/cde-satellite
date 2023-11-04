import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites } from '../functions/consolid';
import { getAccessRights, sign, verify } from '../functions/signature';
import { loadTurtle, loadUrl, validate, validateTurtle } from '../functions/validate';
import { Catalog } from 'consolid-daapi';
import { RDF } from '@inrupt/vocab-common-rdf';
import { v4 } from "uuid"
import { sparqlUpdateViaRESTAPI } from '../functions/general';
import { getRequirementsPBAC } from '../functions/pbac';

const { Readable } = require('stream');

const VaultController = {
  async addAccessRuleToCollection(req: Request, res: Response) {
  },
  async addVisitorRequirement(req: Request, res: Response) {
  },
  async addResourceRequirement(req: Request, res: Response) {
  },
  async PBACInteraction(req: Request, res: Response) {
    if (!req.query.resource) { return res.status(400).send("no resource provided") }
    if (typeof req.query.resource !== "string") { return res.status(400).send("invalid resource provided") }
    const resource = req.query.resource
    const resourceId = req.query.resource.split("/").pop()
    const owner = resource.replace(resourceId!, "profile/card#me")
    const satellite = await getSatellites(owner)

    let mode 
    switch(req.method) {
      case "GET":
        mode = "http://www.w3.org/ns/auth/acl#Read"
        break;
      case "POST":
        mode = "http://www.w3.org/ns/auth/acl#Append"
        break;
      case "PUT":
        mode = "http://www.w3.org/ns/auth/acl#Write"
        break;
      case "DELETE":
        mode = "http://www.w3.org/ns/auth/acl#Write"
        break;
      default:
        break;
    }
    let pbacCredentials = req.headers.pbac
    let response
    try {
     response = await getRequirementsPBAC(satellite.sparql, resource, mode, req.auth.webId, pbacCredentials)
    } catch (error) {
      res.send(error)
      return
    }

    const contentType = response.headers.get('content-type'); // Get the content type from response headers
    const content = await response.text(); // Fetch and store the response body as a Buffer

    if (contentType) {
      res.setHeader('Content-Type', contentType); // Set content type based on the response
    } else {
      // Set a default content type if the server didn't provide one
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    res.status(200).send(content); // Send the Buffer as the response body
  },
  async createShapeCollection(req: Request, res: Response) {
    const collectionUrl = req.auth.webId.replace("profile/card#me", v4())
    const shapeCollection = new Catalog(session, collectionUrl)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#ShapeCollection"
    }]
    if (req.body.boundary) {
      md.push({
        predicate: "https://w3id.org/consolid#hasBoundary",
        object: req.body.boundary
      })
    }
    await shapeCollection.create(true, md)
    return res.status(200).send(collectionUrl)
  },
  async createShape(req: Request, res: Response) {
    let content
    if (req.file) {content = req.file}
    else if (req.body.file) {content = req.body.file}
    else { return res.status(400).send("no shape provided") }

    let shapeDatasetUrl
    if (req.params.shapeCollectionId) {
      const collectionUrl = req.auth.webId.replace("profile/card#me", req.params.shapeCollectionId)
      const shapeCollection = new Catalog(session, collectionUrl)
      shapeDatasetUrl = await shapeCollection.addDataset()
    } else {
      shapeDatasetUrl = req.auth.webId.replace("profile/card#me", v4())
    }

    const shapeDataset = new Catalog(session, shapeDatasetUrl)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#ValidationResource"
    }]

    await shapeDataset.create(true, md)

    let distributionUrl
    if (content.buffer.toString('utf-8').startsWith("http")) {
      distributionUrl = await shapeDataset.addDistribution(content)
    } else {
      const report = await validateTurtle(Readable.from(content.buffer))
      if (report.errors.length) { return res.status(400).send(report) }
      distributionUrl = await shapeDataset.addDistribution()
      await shapeDataset.dataService.writeFileToPod(content.buffer, distributionUrl, true, "application/json")
    }

    return res.status(200).send(distributionUrl)
  },
  async createRuleCollection(req: Request, res: Response) {
    const collectionUrl = req.auth.webId.replace("profile/card#me", v4())
    console.log('collectionUrl :>> ', collectionUrl);
    const ruleCollection = new Catalog(session, collectionUrl)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#RuleCollection"
    }]
    await ruleCollection.create(true, md)
    return res.status(200).send(collectionUrl)
  },
  async createAccessRule(req: Request, res: Response) {
    if (!req.body.rule) { return res.status(400).send("no rule provided") }
    const report = await validateTurtle(Readable.from(req.body.rule))

    if (report.errors.length) { return res.status(400).send(report) }

    let ruleDatasetUrl
    if (req.params.ruleCollectionId) {
      const collectionUrl = req.auth.webId.replace("profile/card#me", req.params.ruleCollectionId)
      const ruleCollection = new Catalog(session, collectionUrl)
      ruleDatasetUrl = await ruleCollection.addDataset()
    } else {
      ruleDatasetUrl = req.auth.webId.replace("profile/card#me", v4())
    }

    const ruleDataset = new Catalog(session, ruleDatasetUrl)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#AccessResource"
    }]

    await ruleDataset.create(true, md)
    const distributionUrl = await ruleDataset.addDistribution()
    await ruleDataset.dataService.writeFileToPod(Buffer.from(req.body.rule), distributionUrl, true, "text/turtle")

    return res.status(200).send(distributionUrl)
  },
  async getAccessCertificate(req: Request, res: Response) {

    const me = await fetch(process.env.WEBID!, { headers: { "Accept": "application/ld+json" } }).then(res => res.json()).then(i => i.filter(i => i["@id"] === process.env.WEBID))
    const sparqlsat = me[0]["https://w3id.org/consolid#hasSparqlSatellite"][0]["@id"]
    const verifyUrl = me[0]["https://w3id.org/consolid#hasConSolidSatellite"][0]["@id"] + "verify"
    const publicKey = me[0]["https://w3id.org/consolid#hasPublicKey"][0]["@id"]
    const allowed = sparqlsat.replace("/sparql", `/allowed/read?actor=${encodeURIComponent(req.auth.webId)}`)

    const message = await getAccessRights(allowed)
    const signature = await sign({ message }, publicKey, verifyUrl, req.auth.webId)
    return res.status(200).send({ token: signature })
  },
  async verify(req: Request, res: Response) {
    try {
      const data = await verify(req.body.token)
      return res.status(200).send(data)
    } catch (error) {
      return res.status(400).send(error)
    }
  },
  async sign(req: Request, res: Response) {
    const message = req.body.message
    if (!message) { return res.status(400).send("no message provided") }
    const me = await fetch(process.env.WEBID!, { headers: { "Accept": "application/ld+json" } }).then(res => res.json()).then(i => i.filter(i => i["@id"] === process.env.WEBID))
    const verifyUrl = me[0]["https://w3id.org/consolid#hasConSolidSatellite"][0]["@id"] + "verify"
    const publicKey = me[0]["https://w3id.org/consolid#hasPublicKey"][0]["@id"]
    console.log('message :>> ', message);
    const signature = await sign({ message }, publicKey, verifyUrl, req.auth.webId)
    return res.status(200).send({ token: signature })
  },
  async validate(req: Request, res: Response) {
    let report
    let data, shapes
    if (req.body.shapeUrl && req.body.dataUrl) {
      shapes = await loadUrl(req.body.shapeUrl)
      data = await loadUrl(req.body.dataUrl)
    } else if (req.body.shapeGraph && req.body.dataGraph) {
      shapes = await loadTurtle(req.body.shapeGraph)
      data = await loadTurtle(req.body.dataGraph)
    } else {
      res.send('not implemented')
    }

    report = await validate(data, shapes)

    res.status(200).send(report)
  },
  async createAuthority(req: Request, res: Response) {
    if (!req.body.type) { return res.status(400).send("no type provided") }

    let url, content
    const root = req.auth.webId.replace("profile/card#me", "")
    const distributionUrl = root + v4()
    url = root + v4()

    if (req.body.type === "https://w3id.org/consolid#ExplicitAuthority") {
      if (!req.body.webId) { return res.status(400).send("no webId provided") }
      const webId = req.body.webId

      content = `
      @prefix pbac: <https://w3id.org/pbac#> .   
      @prefix dcterms: <http://purl.org/dc/terms/> .

      <${distributionUrl}> a pbac:TrustedAuthority ;
        dcterms:identifier "${webId}" . `

    } else if (req.body.type === "https://w3id.org/consolid#ImplicitAuthority") {
      if (!req.body.issuerRequirement) { return res.status(400).send("no issuer requirement provided for implicit authority.") }
      const issuerRequirement = req.body.issuerRequirement
      content = `
      @prefix pbac: <https://w3id.org/pbac#> .
      <${distributionUrl}> a pbac:TrustedAuthority ;
        pbac:issuerRequirement <${issuerRequirement}> .`

    } else {
      return res.status(400).send("invalid type")
    }

    const authorityDefinition = new Catalog(session, url)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#AuthorityResource"
    }]
    await authorityDefinition.create(true, md)
    await authorityDefinition.addDistribution(distributionUrl)

    await authorityDefinition.dataService.writeFileToPod(Buffer.from(content), distributionUrl, true, "text/turtle")
    res.status(201).send(distributionUrl)
  },
  async createRequirement(req: Request, res: Response) {
    if (!req.body.requirement) { return res.status(400).send("no requirement provided") }
    // const report = await validateTurtle(Readable.from(req.body.requirement))
    // if (report.errors.length) { return res.status(400).send(report) }

    const root = req.auth.webId.replace("profile/card#me", "")
    const requirementUrl = root + v4()
    const distributionUrl = root + v4()
    const requirementDefinition = new Catalog(session, requirementUrl)
    const md = [{
      predicate: RDF.type,
      object: "https://w3id.org/consolid#RequirementResource"
    }]
    
    await requirementDefinition.create(true, md)
    await requirementDefinition.addDistribution(distributionUrl)
    await requirementDefinition.dataService.writeFileToPod(Buffer.from(req.body.requirement), distributionUrl, true, "text/turtle")
    res.status(201).send(distributionUrl)
  },
  async addAuthorityToRequirement(req: Request, res: Response) {
    if (!req.body.authorityURI) { return res.status(400).send("no authority provided") }
    const requirementUrl = req.auth.webId.replace("profile/card#me", req.params.requirementId)
    console.log('requirementUrl :>> ', requirementUrl);
    const query = `prefix pbac: <https://w3id.org/pbac#>
    INSERT DATA {<${requirementUrl}> pbac:hasTrustedAuthority <${req.body.authorityURI}>}`
    console.log('query :>> ', query);
    await sparqlUpdateViaRESTAPI(requirementUrl, query, session.fetch)
    res.status(201).send()
  }
}


export default VaultController; 