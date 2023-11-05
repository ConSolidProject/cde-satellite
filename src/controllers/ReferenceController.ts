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
        const root = req.auth.webId.replace('profile/card#me', '')
        const referenceRegistry = root + req.params.registryId
        const referenceId = v4()
        const reference = referenceRegistry + '/' + referenceId
        const selectorId = v4()
        const selector = referenceRegistry + '/' + selectorId
        const conformsTo = req.body.conformsTo
        const id = req.body.identifier
        const source = req.body.source

        let concept
        if (req.body.referenceCollection) {
          concept = req.body.referenceCollection
        } else {
          concept = referenceRegistry + '/' + v4()
        }

        const query = `
        PREFIX consolid: <https://w3id.org/consolid#>
        PREFIX oa: <http://www.w3.org/ns/oa#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        INSERT DATA {
            <${concept}> a consolid:ReferenceCollection ;
            consolid:aggregates <${reference}> .
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

        res.status(201).send({referenceCollection: concept, reference, selector, identifier: id})
    },
    async createAlias(req: Request, res: Response) {
        const referenceCollection = req.body.referenceCollection
        let referenceRegistry
        if (referenceCollection.split('#').length > 1) {
            referenceRegistry = referenceCollection.split('#')[0]
        } else {
            referenceRegistry = referenceCollection.substring(0, referenceCollection.lastIndexOf('/'));
        }
        const alias = req.body.alias

        const query = `
        PREFIX consolid: <https://w3id.org/consolid#>
        INSERT DATA {
            <${referenceCollection}> consolid:aggregates <${alias}> .
        }`

        console.log('query :>> ', query);
        console.log('referenceRegistry :>> ', referenceRegistry);
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