import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites, getConSolidProjectByIdLTBQ, getReferenceRegistry, getService } from '../functions/consolid';
import { generateIndex } from '../functions/icdd';
import { getAccessRights, sign } from '../functions/signature';
import { QueryEngine } from '@comunica/query-sparql';

const IcddController = {
  async createIcddContainer(req: Request, res: Response) {
    const {sparql} = await getSatellites(req.auth.webId)
    if (sparql === undefined) {
      res.send('No SPARQL satellite found - not implemented') 
    } else {
      // get consolidProject
      const project = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
      const refRegPromise = project.map(partial => getReferenceRegistry(partial.sparql, partial.projectUrl))
      const tokenPromise = project.map(partial => session.fetch(partial.consolid + "access").then(i=> i.json()))
      const tokens = await Promise.all(tokenPromise)
      const aggregatorPromise = project.map(partial => getService(partial.projectUrl, "https://www.w3.org/TR/sparql11-query/"))
      const aggregators = await Promise.all(aggregatorPromise).then(i => i.filter(i => i))
      
      let index, links
      if (aggregators.length) {
        const aggregator = aggregators[0] + "/sparql"
        const index = await generateIndex(req.params.projectId, tokens, aggregator)
        console.log('index :>> ', index);
      }      


      // const all = await Promise.all(refRegPromise)
      // const myEngine = new QueryEngine()
      // const index = await generateIndex(all, req.params.projectId, myEngine)
 
      res.send(index) 
    } 
  }
};


export default IcddController;