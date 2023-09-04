const data = "<http://localhost:3000/architect-duplex/455a9c3b-15ac-4854-b5e5-4cd20da5104a> <http://www.w3.org/ns/dcat#dataset> <http://localhost:3000/owner-duplex/2b961d48-77ac-4d7b-8297-c18ce24a3b6f> ."
const parts = data.split(' ')
const aggregatingProject = parts[0].slice(1, -1)
const originalProject = parts[2].split("/")[parts[2].split("/").length -1].replace('>', '')

console.log('aggregatingProject :>> ', aggregatingProject);
