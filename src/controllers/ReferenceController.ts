import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites, getConSolidProjectByIdLTBQ, getReferenceRegistry } from '../functions/consolid';
import { generateIndex } from '../functions/icdd';
import { getAccessRights, sign } from '../functions/signature';
import { ReferenceRegistry } from 'consolid-raapi';
import { v4 } from 'uuid';

const ReferenceController = {
    async createAnnotation(req: Request, res: Response) {
    },
    async updateAnnotation(req: Request, res: Response) {
    },
    async createReferenceCollection(req: Request, res: Response) {
        const root = req.auth.webId.replace('profile/card#me', '')
        const refRegUrl = root + req.params.registryId
        const rr = new ReferenceRegistry(session, refRegUrl)
        const rc = await rr.createConcept()
        res.status(200).send(rc)
    },
    async createReference(req: Request, res: Response) {
        const referenceCollection = req.body.referenceCollection
        const referenceRegistry = referenceCollection.split('#')[0]
        const referenceId = v4()
        const reference = referenceRegistry + '/' + referenceId
        const selectorId = v4()
        const selector = referenceRegistry + '/' + selectorId
        const conformsTo = req.body.conformsTo
        const id = req.body.identifier
        const source = req.body.source

        const query = `
        PREFIX consolid: <https://w3id.org/consolid#>
        PREFIX oa: <http://www.w3.org/ns/oa#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        INSERT DATA {
            <${referenceCollection}> consolid:aggregates <${reference}> .
            <${reference}> a consolid:Reference ;
                oa:hasSource <${source}> ;
                oa:hasSelector <${selector}> .
            <${selector}> a oa:FragmentSelector ;
                rdf:value "${id}"^^xsd:string ;
                oa:conformsTo <${conformsTo}> .
        }`

        await session.fetch(referenceRegistry, {
            method: 'PATCH',
            body: query,
            headers: {
                'Content-Type': 'application/sparql-update'
            }
        })

        res.status(201).send(reference)
    },
    async createAlias(req: Request, res: Response) {
        const referenceCollection = req.body.referenceCollection
        const referenceRegistry = referenceCollection.split('#')[0]
        const alias = req.body.alias

        const query = `
        PREFIX consolid: <https://w3id.org/consolid#>
        INSERT DATA {
            <${referenceCollection}> consolid:aggregates <${alias}> .
        }`

        await session.fetch(referenceRegistry, {
            method: 'PATCH',
            body: query, 
            headers: { 
                'Content-Type': 'application/sparql-update'
            }
        })
        res.status(201).send(alias)
    },
};



export default ReferenceController;