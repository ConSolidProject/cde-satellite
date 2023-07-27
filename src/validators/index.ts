interface IValidator {
    [key: string]: {
        function: (message: string) => Promise<boolean>
        shape: string
    };
  }

export const validatorFunctions: IValidator = {
    "projectInvite": {function: validateProjectInvite, shape: "https://consolid.org/shapes/projectInviteShape.ttl"},
}

export async function validateProjectInvite(message: string) {
    const shape = validatorFunctions["projectInvite"].shape
    const valid = await validate(message, shape)
    return valid
}

export async function validate(message: string, shape: string) {
    return true
}