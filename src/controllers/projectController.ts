import { Request, Response } from 'express';
import {
  getConSolidProjects,
  createProject,
  getSatellites,
  getConSolidProjectById,
  addDatasetToProject,
  addPartialProjectsToProject,
  getReferenceRegistry,
  updateResource,
  deleteResource,
  deleteRecursively,
  getProjectDatasets,
  getConSolidProjectByIdLTBQ,
  resolveId,
  getDatasetDistributions
} from '../functions/consolid';
import { ReferenceRegistry } from 'consolid-raapi';
import { v4 } from 'uuid';
import { getShapeCollection, getShapeUrls, createShapeGraph } from '../functions/validate';
import { Catalog } from 'consolid-daapi';
import { RDF } from '@inrupt/vocab-common-rdf';

const ProjectController = {
  async createConSolidProject(req: Request, res: Response) {
    const projectUrl = await createProject(req.auth.webId, req.body.existingPartialProjects, req.body.projectId, req.body.refRegId, req.body.metadata)
    res.status(201).send(projectUrl)
  },
  async getConSolidProject(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (satellite) {
      const info = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
      console.log('info :>> ', info);
      res.status(200).send(info)
    } else {
      res.status(404).send('No satellite found')
    }
  },
  async getConSolidProjects(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (satellite) {
      const projects = await getConSolidProjects(satellite)
      res.status(200).send(projects)
    } else {
      res.status(404).send('No satellite found')
    }
  },
  // async updateConSolidProject(req: Request, res: Response) {
  //   const satellite = await getSparqlSatellite(req.auth.webId)
  //   if (satellite) {
  //     const project = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
  //     if (!project) {
  //       res.status(404).send('Project not found')
  //       return
  //     }

  //     const accessPoint = project.filter(p => p.accessPoint)[0].projectUrl
  //     const update = req.body.toString('utf-8')
  //     await updateResource(accessPoint, update)
  //     res.status(201).send()
  //   } else {
  //     res.status(404).send('No satellite found')
  //   }
  // },
  async deleteConSolidProject(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }

    const project = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
    if (!project) {
      res.status(404).send('Project not found')
      return
    }

    const accessPoint = project.filter(p => p.accessPoint)[0]

    if (!Boolean(req.query.recursive)) {
      await deleteResource(accessPoint.projectUrl)
    } else {
      await deleteRecursively(accessPoint)
    }
    res.status(204).send()
  },

  async addPartialProjects(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (satellite) {
      const projectUrl = await getConSolidProjectById(satellite, req.params.projectId)
      await addPartialProjectsToProject(projectUrl, req.body.partialProjects)
      res.status(201).send('Stakeholders added')
    } else {
      res.status(404).send('No satellite found')
    }
  },

  async getConSolidDatasets(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const project = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
    if (!project) {
      res.status(404).send('Project not found')
      return
    }
    const distributionFilter = req.body.distributionFilter
    const datasetFilter = req.body.datasetFilter
    console.log('project :>> ', project);
    const datasets = await getProjectDatasets(project, { distributionFilter, datasetFilter })
    res.status(200).send(datasets)
  },

  async addDataset(req: Request, res: Response) {
      const projectUrl = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
      if (!projectUrl) {
        res.status(404).send('Project not found')
        return
      }

      let content
      if (req.file) {content = req.file}
      else if (req.body.file) {content = req.body.file}
      const datasetMeta = req.body.datasetMetadata || "[]"
      const distMeta = req.body.distributionMetadata || "[]"

      const datasetOrValidationReport = await addDatasetToProject(projectUrl, undefined, content, JSON.parse(datasetMeta), JSON.parse(distMeta))
      if (typeof datasetOrValidationReport === "string") {
        const datasetContent = await fetch(datasetOrValidationReport).then(res => res.text())
        res.status(201).send(datasetContent) 
      } else {
        res.status(500).send(datasetOrValidationReport)
      }
  }, 
  async deleteDataset(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const dataset = resolveId(req.params.id, req.auth.webId)
    const distributions = await getDatasetDistributions(satellite, dataset)
    await Promise.all(distributions.map(async (distribution) => {
      await deleteResource(distribution)
    }))

    await deleteResource(dataset)
    res.status(204).send()
  },

  async deleteDistribution(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const dist = resolveId(req.params.id, req.auth.webId)
    await deleteResource(dist)
    res.status(204).send()
  },

  async getReferenceRegistry(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const projectUrl = resolveId(req.params.projectId, req.auth.webId)
    const refReg = await getReferenceRegistry(satellite, projectUrl)
    if (!refReg) {
      res.status(404).send('Reference registry not found')
      return
    }
    res.status(200).send(refReg)
  },


  async createReference(req: Request, res: Response) {
    const { sparql: satellite, consolid } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const projectUrl = await getConSolidProjectById(satellite, req.params.projectId)
    if (!projectUrl) {
      res.status(404).send('Project not found')
      return
    }

    const refRegUrl = await getReferenceRegistry(satellite, projectUrl)
    if (!refRegUrl) {
      res.status(404).send('Reference registry not found')
      return
    }

    const refReg = new ReferenceRegistry(session, refRegUrl)
    let concept
    if (req.body.referenceCollection) {
      concept = req.body.referenceCollection
    } else {
      concept = await refReg.createConcept()
    }

    const reference = await refReg.createReference(concept, refRegUrl + "#" + v4(), req.body.source, req.body.identifier, req.body.conformance)

    res.status(200).send(concept)

  },

  async createShapeCollection(req: Request, res: Response) {
    let {boundary, collectionUrl} = req.body
    const { sparql: satellite } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const projectUrl = await getConSolidProjectById(satellite, req.params.projectId)
    if (!projectUrl) {
      res.status(404).send('Project not found')
      return
    }

    const project = new Catalog(session, projectUrl)
    const datasetUrl = await project.addDataset(collectionUrl)
    await project.addMetadata([{ predicate: "https://w3id.org/consolid#hasShapeCollection", object: datasetUrl }])

    if (!collectionUrl) {
      const md = new Catalog(session, datasetUrl)
      const metadata = [{
        predicate: RDF.type,
        object: "https://w3id.org/consolid#ShapeCollection"
      }]
  
      if (boundary) {
        metadata.push({
          predicate: "https://w3id.org/consolid#boundary",
          object: boundary
        })
      }
  
      await md.create(true, metadata)
    }

    res.status(201).send(datasetUrl)

  },

  async createShape(req: Request, res: Response) {

    let shapeData 
    
    if (req.file) {shapeData = req.file.buffer}
    else if (req.body.file) {shapeData = req.body.file}
    else {res.status(400).send('No shape data provided'); return}

    const url = req.body.shapeUrl
    const { sparql: satellite } = await getSatellites(req.auth.webId)
    if (!satellite) {
      res.status(404).send('No satellite found')
      return
    }
    const projectUrl = await getConSolidProjectById(satellite, req.params.projectId)
    if (!projectUrl) {
      res.status(404).send('Project not found')
      return
    }
    const shapes = await getShapeCollection(projectUrl)
    const shapeCat = new Catalog(session, shapes)
    
    
    const shapeUrl = await shapeCat.addDataset(url)


    // the shape is to be created as well as referenced
    let distributionUrl
    if (!url) {
      const shape = new Catalog(session, shapeUrl)
      const metadata = [{
        "predicate": RDF.type,
        "object": "https://w3id.org/consolid#ValidationResource"
      }]
      await shape.create(true, metadata)
      distributionUrl = await shape.addDistribution()
      await shape.dataService.writeFileToPod(shapeData, distributionUrl, true, 'text/turtle')

      // the shape does already exist somewhere, and can be referenced without duplicating it on the pod
    } else {
      const data = await session.fetch(url, {headers: {"Accept": "application/ld+json"}}).then(res => res.json()).then(i => i.filter(i => i["@id"] === url))
      const dist = data && data[0]["http://www.w3.org/ns/dcat#distribution"] && data[0]["http://www.w3.org/ns/dcat#distribution"][0]["@id"]
      const distributionUrl = data && dist && dist[0]["http://www.w3.org/ns/dcat#accessURL"] && dist[0]["http://www.w3.org/ns/dcat#accessURL"][0]["@id"]

      // if there is no distributionURL this means the passed url was not a dcat:dataset, but an external shape in itself. Therefore, there must be a local dataset that references it to include it in the consolid data patterns
      if (!distributionUrl) {
        const shape = new Catalog(session, shapeUrl)
        const metadata = [{
          "predicate": RDF.type,
          "object": "https://w3id.org/consolid#ValidationResource"
        }]
        await shape.create(true, metadata)
      }
    }

    res.status(201).send({dataset: shapeUrl, distribution: distributionUrl})
  },

  async getShapes(req: Request, res: Response) {
    const projectUrl = await getConSolidProjectByIdLTBQ(req.auth.webId, req.params.projectId)
    if (!projectUrl) {
      res.status(404).send('Project not found')
      return
    }

    let type
    if (req.query && req.query.type) {type = req.query.type}
    const shapes = await getShapeUrls(projectUrl, type)
    const shapeGraph = await createShapeGraph(shapes)
    res.status(200).send(shapeGraph)
  }
};

export default ProjectController;