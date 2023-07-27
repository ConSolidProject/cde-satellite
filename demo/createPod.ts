import fetch from 'cross-fetch'

export async function createPod(user: any, type: string = "person") {
  let name, email
  if (type === "person") {
    name = user.name,
      email = user.email
  } else if (type === "inbox") {
    name = `inbox_${user.name}`,
    email = user.inboxMail
  }

  const json = {
    podName: name,
    email: email,
    password: user.password,
    confirmPassword: user.password,
    createWebId: true,
    register: true,
    createPod: true
  };
  console.log('json :>> ', json);
  const result = await fetch(`${user.idp}/idp/register/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json)
  })
  return result
}