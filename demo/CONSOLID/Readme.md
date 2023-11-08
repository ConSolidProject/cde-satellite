# Reproduction of a ConSolid case study: Duplex
This demo allows you to create a federated ConSolid project using predefined interaction scripts. The project is based on the [Duplex](https://github.com/buildingSMART/Sample-Test-Files/blob/master/IFC%202x3/Duplex%20Apartment/README.md) open source project from buildingSMART. The resources are hosted [here](https://drive.google.com/drive/folders/1qgXtFOH3iRlfvZxD9c6J7d5TWmBzbJea?usp=drive_link). Copy the resources to your local machine into the folder called `resources/duplex`. 

## Prerequisites
- A running [Fuseki Server](https://dlcdn.apache.org/jena/binaries/apache-jena-fuseki-4.10.0.zip).
- A running [ConSolid Server (Fuseki-extension)](https://github.com/LBD-Hackers/SolidCommunity_Fuseki) with at least one user account created. When the server is initialised, you can create a user account by navigating to `http://localhost:3000`; you will be guided through the process of creating a user account **in its own namespace**. This account may be a demo account (e.g. demo@demo.org) and is only used for the internal setup of the Solid Server. It will not be used for this demo. Make sure the Fuseki Server is running before creating any accounts. 
- A running [SPARQL satellite](https://github.com/ConSolidProject/sparql-satellite/tree/dissertation)
- A [ConSolid satellite](https://github.com/ConSolidProject/cde-satellite/tree/dissertation). This satellite should only be started after the first script (to create the accounts) has been executed.
- A global installation of [TS-node](https://www.npmjs.com/package/ts-node) and [Typescript](https://www.npmjs.com/package/typescript) (for the scripts)

## Setup
The setup document that will be used by these scripts is hosted in the folder [/userConfigs](/userConfigs). The setup document contains the following information:

```json
{
    "owner": {
        "name": "owner-duplex",
        "password": "test123",
        "consolid": "http://localhost:5001/",
        "resources": []
    },
    "architect":  {
        "name": "architect-duplex",
        "password": "test123",
        "resources": ["../resources/duplex/duplex_architecture.ttl", "../resources/duplex/duplex_architecture.gltf"],
        "consolid": "http://localhost:5002/",
        "tags": ["duplex_architecture"],
        "align": true
    },
    "engineer": {
        "name": "engineer-duplex",
        "password": "test123",
        "resources": ["../resources/duplex/duplex_hvac.gltf", "../resources/duplex/duplex_hvac.ttl"],
        "consolid": "http://localhost:5003/",
        "tags": ["duplex_hvac"],
        "align": true
    },
    "fm": {
        "name": "fm-duplex",
        "password": "test123",
        "consolid": "http://localhost:5004/",
        "resources": ["../resources/duplex/crack.jpg"]

    }
}
```

This information will be used to create the accounts, authenticate to the Solid Server and upload the indicated resources. The "consolid" field will be added to the WebId as `consolid:hasConSolidSatellite`. The "align" field indicates whether an alignment should be attempted on this vault (script: action_createAlignment.ts). The "tags" field indicates which tags should be used to identify files that need to be aliged as LBD-glTF couples. For example, the architect has the tag "duplex_architecture" - and a TTL and glTF file that will be uploaded. Because their metadata will contain a tag including their original filename, the alignment script will identify them as a couple and align them. 

If you want to use the scrips with your own project, you can change the resources in the setup document. Make sure that the resources are available on your local machine and that the paths are correct. 

### Create Infrastructure
This script will create the necessary accounts for the demo, based on the JSON document in the folder [/userConfigs](/userConfigs).
- `cd CONSOLID/actions`
- `ts-node action_createInfrastructure.ts --userConfig "duplex"`

### Create Federated Project
This script will create a new ConSolid project in the owner's vault. A workflow is mimicked where after initiation, invites to participate are sent to the architect, engineer and facility manager ([LDN Notifications](https://www.w3.org/TR/ldn/)). They will accept the invite and create a project access point on their Pod, which aggregates the original project from the owner. A notification is sent to the inbox of the owner, allowing them to aggregate the new partial projects in turn. The architect, engineer and facility manager do not need to aggregate each other's partial projects, as they may discover those through the owner's project access point. This process may take some minutes.
- `ts-node .\action_createProject.ts --userConfig "duplex" --initiator "owner"`

### Create Dataset
This script will upload the resources associated with each user account in the user configuration. This means a DCAT dataset and a DCAT distribution will be created, with the file's content as the distribution.
- `ts-node .\action_createDataset.ts --userConfig "duplex"`

### Create Alignment
This script will align the resources associated with each user account in the user configuration. This means that the resources will be aligned as Reference Collections with 2 references, one in the LBD (Turtle) file, and one in the glTF 3D model. To find the correct resources on the data vaults, the tags in the user configuration will be used. Note that this script uses a PROPS level 2 link between a semantic instance and the original GUID (?ttl props:globalIdIfcRoot/schema:value ?gltf). In a PROPS level 1 scenario, the link is made directly (?ttl props:globalIdIfcRoot_attribute_simple ?gltf). 
- `ts-node .\action_createAlignment.ts --userConfig "duplex"`

### Add Damage Record to the project
In this script, the FM will create a damage record in their vault. This damage record will be linked as a representation of a new Reference Collection. A pixel zone in image `crack.jpg`, which was uploaded in the previous step, will also be indicated as a representation of this Reference Collection. This script mimicks a selection of the damaged element via a 3D interface, which displays the architectural model. This allows the Reference Collection to immediately aggregate the Reference Collection of which this 3D element is a representation, as a remote alias on the architect's vault.
- `ts-node .\action_addDamageRecord.ts --userConfig "duplex"`