import { Request, Response } from 'express';
import { getConSolidProjects, getSparqlSatellite, createProject, getConSolidProjectById, addDatasetToProject, getAccessPointUrl, addPartialProjectsToProject} from '../functions/consolid';

const ProjectController = {
  async createConSolidProject(req: Request, res: Response) {
    const projectUrl = await createProject(req.auth.webId, req.body.existingPartialProjects, req.body.projectId, req.body.refRegId)
    res.status(201).send(projectUrl)
  },
  
  async getConSolidProject(req: Request, res: Response) {
    const satellite = await getSparqlSatellite(req.auth.webId)
    if (satellite) {
      const info = await getConSolidProjectById(satellite, req.params.projectId)
      res.status(200).send(info)
    } else {
      res.status(404).send('No satellite found')
    }
  },
  async getConSolidProjects(req: Request, res: Response) {
    const satellite = await getSparqlSatellite(req.auth.webId)
    if (satellite) {
      const projects = await getConSolidProjects(satellite)
      res.status(200).send(projects)
    } else {
      res.status(404).send('No satellite found')
    }
  },
  async addPartialProjects(req: Request, res: Response) {
    const satellite = await getSparqlSatellite(req.auth.webId)
    if (satellite) {
      const projectUrl = await getAccessPointUrl(satellite, req.params.projectId)
      await addPartialProjectsToProject(projectUrl, req.body.partialProjects)
      res.status(201).send('Stakeholders added')
    } else {
      res.status(404).send('No satellite found')
    }
  },
  async addDataset(req: Request, res: Response) {
    const satellite = await getSparqlSatellite(req.auth.webId)
    if (satellite) {
      const projectUrl = await getAccessPointUrl(satellite, req.params.projectId)
      const datasetUrl = await addDatasetToProject(projectUrl, undefined, req.file)
      const datasetContent = await fetch(datasetUrl).then(res => res.text())
      res.status(201).send(datasetContent)
    } else {
      res.status(404).send('No satellite found')
    }

  }
}; 

 

export default ProjectController;