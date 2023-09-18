import { Request, Response } from 'express';
import { getConSolidProjects, getSatellites } from '../functions/consolid';

const IcddController = {
  async createIcddContainer(req: Request, res: Response) {
    const {sparql} = await getSatellites(req.auth.webId)
    if (sparql === undefined) {
      res.send('No SPARQL satellite found - not implemented')
    } else {
      await getConSolidProjects(sparql)
      res.send(sparql)
    }
  }
};



export default IcddController;