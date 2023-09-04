interface IValidator {
    [key: string]: {
        function: (message: string) => Promise<boolean>
        shape: string
    };
  }

export const validatorFunctions: IValidator = {
    "http://w3id.org/conSolid/ProjectCreation": {function: validateProjectInvite, shape: "https://consolid.org/shapes/projectInviteShape.ttl"},
    "http://w3id.org/conSolid/ProjectAggregation": {function: validateProjectAggregation, shape: "https://consolid.org/shapes/projectAggregationShape.ttl"},
}

export async function validateProjectInvite(message: string) {
    const shape = validatorFunctions["http://w3id.org/conSolid/ProjectCreation"].shape
    const valid = await validate(message, shape)
    return valid
}

export async function validateProjectAggregation(message: string) {
    const shape = validatorFunctions["http://w3id.org/conSolid/ProjectCreation"].shape
    const valid = await validate(message, shape)
    return valid
}


export async function validate(message: string, shape: string) {
    return true
}