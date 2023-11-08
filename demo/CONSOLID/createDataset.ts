import { prepareFirstUse, wait } from "./createPod";
import { inviteToProject } from '../../src/functions/notifications'
import { queryWithComunica } from "../../src/functions/general";
import { QueryEngine } from "@comunica/query-sparql";
import { v4 } from 'uuid'
import path from "path"
import fs from "fs"
import { prepare } from "./createProject";
import FormData from "form-data";

export async function createDataset(actors) {
    for (const a of Object.keys(actors)) {
        const actor = actors[a]

        const projects = await getMyProjects(actor)
        console.log('projects :>> ', projects);
        const project = projects[0]
        const projectId = project.split('/').pop()

        for (const file of actor.resources) {
            const form = new FormData()
            form.append('file', fs.createReadStream(file))

            var requestOptions = {
                method: 'POST',
                body: form,
                redirect: 'follow'
            };

            await actor.fetch(`${actor.consolid}project/${projectId}/dataset/`, requestOptions)
        }
    }
}

async function getMyProjects(actor) {
    const projects = await actor.fetch(`${actor.consolid}project/`).then(p => p.json())
    if (!projects.length) {
        throw new Error('No projects found')
    } else {
        return projects
    }
}

