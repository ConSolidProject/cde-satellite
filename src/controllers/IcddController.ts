import { Request, Response } from 'express';
import { getConSolidProjects, getSparqlSatellite } from '../functions/consolid';

const IcddController = {
  async createIcddContainer(req: Request, res: Response) {
    const satellite = await getSparqlSatellite(req.auth.webId)
    if (satellite === undefined) {
      res.send('No SPARQL satellite found - not implemented')
    } else {
      await getConSolidProjects(satellite)
      res.send(satellite)
    }
  }
};



export default IcddController;