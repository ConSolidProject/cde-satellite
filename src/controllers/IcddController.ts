import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites, getConSolidProjectByIdLTBQ, getReferenceRegistry } from '../functions/consolid';
import { generateIndex } from '../functions/icdd';
import { getAccessRights, sign } from '../functions/signature';

const IcddController = {
  async createIcddContainer(req: Request, res: Response) {
    const {sparql} = await getSatellites(req.auth.webId)
    if (sparql === undefined) {
      res.send('No SPARQL satellite found - not implemented') 
    } else {
      // get consolidProject
      const project = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
      const registries: string[] = []
      const tokens: string[] = []
      for (const partial of project) {
        // const rr = await getReferenceRegistry(partial.sparql, partial.projectUrl)
        // registries.push(rr)
        const {token} = await session.fetch(partial.consolid + "access").then(i=> i.json())
        tokens.push(token)
      }

      const index = await generateIndex(req.params.projectId, tokens)


 
      res.send()
    } 
  }
};



export default IcddController;