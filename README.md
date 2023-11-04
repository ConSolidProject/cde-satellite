# ConSolid API
This repository contains a prototype for a ConSolid satellite in the ConSolid ecosystem [Werbrouck et al., 2023](https://content.iospress.com/articles/semantic-web/sw233396). The ConSolid satellite is a service exclusively tied to a single data vault, and allows interfacing with this data vault in a more high-level way, generating data that is compatible with the federated catalogues in the ConSolid ecosystem.

## Initialisation
* Run `git clone https://github.com/ConSolidProject/cde-satellite.git`
* Run `npm install`
* Create a .env file in the `config` folder (or adapt the template provided in `local.env`). The following fields should be included:
```EMAIL=example@example.org
PASSWORD=test123
IDP=http://localhost:3000
WEBID=http://localhost:3000/example/profile/card#me
PORT=5002
PRIVATE_KEY_PATH=http://localhost:3000/example/profile/privateKey.pem
```
This allows the satellite to act as you. If you do not want this, you can create a separate WebID for the satellite, and set dedicated access control rules on your Pod, to limit the control the satellite has over your Pod. For demo purposes, the first option should be ok. 

* Run `npm run start`


* Make sure each WebID has a new property attached to find their SPARQL satellite. This can be done by adding the following triple to their WebID:
`<#me> <https://w3id.org/consolid#hasConSolidSatellite> <http://localhost:{PORT}/>.`

## Signatures
* If you want your satellite to have the ability to sign certificates on your behalf, you need to create a private-public key pair (e.g. using [openssl](https://www.openssl.org/)), and store the both keys as a separate resource on your Pod. Don't forget to protect each file with a dedicated .acl resource. In the case of the private key, only you (or the satellite) should be allowed to access it. An example acl rule for the private key can be: 

```# ACL resource for the WebID profile document
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#owner>
    a acl:Authorization;
    acl:agent <http://localhost:3000/arcadis/profile/card#me>;
    acl:accessTo <http://localhost:3000/arcadis/profile/privateKey.pem>;
    acl:mode acl:Read, acl:Write, acl:Control.
```

The public key may be public:
```# ACL resource for the WebID profile document
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#public>
    a acl:Authorization;
    acl:agentClass foaf:Agent;
    acl:accessTo <http://localhost:3000/arcadis/profile/publicKey.pem>;
    acl:mode acl:Read.

<#owner>
    a acl:Authorization;
    acl:agent <http://localhost:3000/arcadis/profile/card#me>;
    acl:accessTo <http://localhost:3000/arcadis/profile/publicKey.pem>;
    acl:mode acl:Read, acl:Write, acl:Control.
```

* Add the following parameter to you .env file: 
`PRIVATE_KEY_PATH=http://localhost:3000/example/profile/privateKey.pem`

## Authentication
* Request a client secret (response.secret) and an id (response.id) from the Solid Community Server. 
```curl --location 'http://localhost:3000/idp/credentials/' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "example@example.org",
    "password": "test123",
    "name": "demo"
}'
```

* Request a token with {id:secret} as a base64 encoded Basic Auth value. Your token can be found in (response.access_token)
```curl --location 'http://localhost:3000/.oidc/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic {base64{id:secret}} \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=webid'
```

* You can now use the token in your requests as a Bearer token: 
`--header 'Authorization: Bearer {access_token}'`


## Documentation
Explore the API documentation to learn about available endpoints, request parameters, and responses.

### Project API Documentation

1. **Get All Projects**
  - **Method**: GET
  - **Endpoint**: /project/
  - **Description**: Retrieve all ConSolid projects.
  - **Headers**: Authorization: Bearer token (optional)
  - **Success Response**:
    - Code: 200 OK
    - Content: [list of ConSolid projects (DCAT catalog) URLs]
  - **Error Response**:
    - Code: 404 Not Found
    - Content: { error: "No satellite found. Make sure you have a running [SPARQL satellite](https://github.com/ConSolidProject/sparql-satellite.git)" }

2. **Get Specific Project**
  - **Method**: GET 
  - **Endpoint**: /project/:projectId
  - **Description**: Retrieve a specific project by its ID. The ID must be the same as the id (not the URL) of the project on the data vault.
  - **Headers**: Authorization: Bearer token (optional)
  - **URL Params**:
    - projectId (required) - The ID of the project to retrieve.
  - **Success Response**:
    - Code: 200 OK
    - Content: 
    ```
    [{ 
      projectUrl, # the URL of the catalogue
      sparql, # the URL of the corresponding SPARQL endpoint
      consolid, # the URL of the corresponding ConSolid endpoint
      webId, # the WebID of the owner of the project
      accessPoint # whether this is the access point of the project or an aggregated (equivalent) partial project
    }]
    ```

3. **Create New Project**
  - **Method**: POST 
  - **Endpoint**: /project/create
  - **Description**: Create a new conSolid project.
  - **Headers**: Authorization: Bearer token (optional)
  - **Body (optional)**:
    ```
    {
      "existingPartialProjects": [], # these are the URLs of existing partial projects to be aggregated
      "projectId": "string", # if not provided, a GUID will be used.
      "refRegId": "string", # if not provided, a GUID will be used.
      "metadata": [{predicate, object}] # additional (valid RDF) metadata to add as triples to the project
    }
    ```
  - **Success Response**:
    - Code: 201 Created
    - Content:
    ```
    {
      projectUrl # the URL of the access point of the new project on your Pod
    }
    ``` 

4. **Delete Project**
  - **Method**: DELETE 
  - **Endpoint**: /project/:projectId
  - **Description**: Delete a specific project by its ID.
  - **Headers**: Authorization: Bearer token (optional)
  - **URL Params**:
    - projectId (required) - The ID of the project to delete.
  - **Query Params**:
    - recursive (optional) - Flag to delete all related resources. If not provided or set to "false", only the catalogue itself will be deleted.
  - **Success Response**:
    - Code: 204 No Content
  - **Error Response**:
    - Code: 404 Not Found
    - Content: { error: "Project not found" }

5. **Get Project Datasets**
  - **Method**: POST
  - **Endpoint**: `/project/:projectId/datasets`
  - **Description**: Retrieve datasets for a specific ConSolid project.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `projectId` (required) - The ID of the project for which datasets are being retrieved.
  - **Body (optional)**:
    ```
    {
      "distributionFilter", # [{predicate, object}]
      "datasetFilter" # [{predicate, object}]
    }
    ```
  - **Success Response**: 200 OK - Content: `[list of dataset URLs]`
  - **Error Response**: 404 Not Found - Content: `{ "error": "Project not found" }`

6. **Add Dataset to Project**
  - **Method**: POST
  - **Endpoint**: `/project/:projectId/dataset`
  - **Description**: Add a dataset to a specific ConSolid project.
  - **Headers**: Authorization (Bearer token, optional)
  - **Body (optional)**:
  ```
  {
      file, # if a distribution is to be added directly 
      datasetMetadata" # [{predicate, object}]
      distributionMetadata # [{predicate, object}]
  }
  ```

  - **Success Response**: 201 Created - Content: *dataset content as TTL*

7. **Delete Dataset**
  - **Method**: DELETE
  - **Endpoint**: `/dataset/:id` # the project ID is not present here, as a dataset may theoretically be part of multiple projects
  - **Description**: Delete a dataset by its ID.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `id` (required) - The ID of the dataset to delete.
  - **Success Response**: 204 No Content
  - **Error Response**: 404 Not Found - Content: `{ "error": "Dataset not found" }`

8. **Delete Distribution**
  - **Method**: DELETE
  - **Endpoint**: `/distribution/:id` # the project and dataset IDs are not present here, as a dataset may theoretically be part of multiple projects
  - **Description**: Delete a distribution by its ID.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `id` (required) - The ID of the distribution to delete.
  - **Success Response**: 204 No Content
  - **Error Response**: 404 Not Found - Content: `{ "error": "Distribution not found" }`

9. **Add Partial Projects to Project**
  - **Method**: POST
  - **Endpoint**: `/project/:projectId/aggregate`
  - **Description**: Add partial projects to a specific ConSolid project.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `projectId` (required) - The ID of the project to which partial projects are being added.
  - **Body (required)**:
    ```
    {
      "partialProjects": []
    }
    ```
  - **Success Response**: 201 Created - Content: "Stakeholders added"
  - **Error Response**: 404 Not Found - Content: `{ "error": "No satellite found" }`

10. **Get Reference Registry**
  - **Method**: GET
  - **Endpoint**: `/project/:projectId/referenceregistry`
  - **Description**: Retrieve the reference registry for a specific ConSolid project.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `projectId` (required) - The ID of the project for which the reference registry is being retrieved.
  - **Success Response**: 200 OK - Content: *reference registry URL*
  - **Error Response**: 404 Not Found - Content: `{ "error": "Reference registry not found" }`

11. **Get Shapes**
  - **Method**: GET
  - **Endpoint**: `/project/:projectId/shape`
  - **Description**: Retrieve shapes for a specific ConSolid project and bundles them in a single Turtle graph.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `projectId` (required) - The ID of the project for which shapes are being retrieved.
  - **Query Params**:
    - `type` (optional) - Filter shapes by sh:targetClass.
  - **Success Response**: 200 OK - Content: *shapes as TTL*
  - **Error Response**: 404 Not Found - Content: `{ "error": "Project not found" }`

12. **Add Shape Collection**
  - **Method**: POST
  - **Endpoint**: `/project/:projectId/shapecollection`
  - **Description**: Add a shape collection to a specific ConSolid project.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `projectId` (required) - The ID of the project to which the shape collection is being added.
  - **Body (required)**:
    ```
    {
      collectionUrl # (optional) if the collection already exists, otherwise, a new Collection will be created with a random GUID 
    }
    ```
  - **Success Response**: 201 Created
  - **Error Response**: 404 Not Found - Content: `{ "error": "No satellite found" }`


### Vault API Documentation
These operations are intended for managing the vault and its contents, independent from individual ConSolid projects.

1. **Get Access Certificate**

  - **Method**: GET
  - **Endpoint**: `/access`
  - **Description**: Retrieve an access certificate for your WebId on this vault. This includes a list of all resources you are allowed to READ, signed by the satellite. This list may be used for querying project data on a remote RDF Aggregator.
  - **Headers**: Authorization (Bearer token, required)
  - **Success Response**: 200 OK - Content: 
  ```
  { 
    token # access certificate as JWT
  }
  ```
  
2. **Sign Message**
  - **Method**: POST
  - **Endpoint**: `/sign`
  - **Description**: Sign a message as the owner of a Pod. This allows to make statements as an authority on a certain topic. E.g.: "bob isInvolved in Project with ID 123", and sign these statements as certificates. It is related to the [PBAC vocabulary](https://w3id.org/pbac#)
  - **Headers**: Authorization (Bearer token, required)
  - **URL Params**: None
  - **Body (required)**:
    ```
    {
      "message" # the message to sign (for PBAC: as a valid TTL document)
    }
    ```
  - **Success Response**: 200 OK - Content: 
  ```
  {
    token # signed message as JWT
  }
  ```
  - **Error Response**: 400 Bad Request - Content: "no message provided"

3. **Verify Signature**
  - **Method**: POST
  - **Endpoint**: `/verify`
  - **Description**: Verify a signature.
  - **Headers**: None
  - **URL Params**: None
  - **Body (required)**:
    ```
    {
      token # signed message as JWT
    }
    ```
  - **Success Response**: 200 OK - Content: Verification result
  - **Error Response**: 400 Bad Request

4. **Create Shape Collection**
  - **Method**: POST
  - **Endpoint**: `/shapecollection`
  - **Description**: Create a shape collection.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**: None
  - **Success Response**: 200 OK - Content: `Shape Collection URL`

5. **Create Shape in Collection**
  - **Method**: POST
  - **Endpoint**: `/:shapeCollectionId/shape`
  - **Description**: Add a shape to a shape collection.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `shapeCollectionId` (required) - The ID of the shape collection, which will resolve to the Pod associated with the satellite.
  - **Body (required)**: Shape file (Turtle)
  - **Success Response**: 200 OK - Content: `Shape URL`

6. **Create Shape**
  - **Method**: POST
  - **Endpoint**: `/shape`
  - **Description**: Create a shape, without it being aggregated in a Shape Collection
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**: None
  - **Body (required)**: Shape file (Turtle)
  - **Success Response**: 200 OK - Content: `Shape URL`
  - **Error Response**: None

7. **Create Rule Collection (PBAC)**
  - **Method**: POST
  - **Endpoint**: `/rulecollection`
  - **Description**: Create a rule collection.
  - **Headers**: Authorization (Bearer token, optional)
  - **Success Response**: 200 OK - Content: `Rule Collection URL`
  - **Error Response**: None

8. **Create Access Rule (PBAC)**
  - **Method**: POST
  - **Endpoint**: `/rule`
  - **Description**: Create an access rule.
  - **Headers**: Authorization (Bearer token, optional)
  - **Body (required)**: Rule file (Turtle)
  - **Success Response**: 200 OK - Content: `Distribution URL of Access Rule`

An example access rule is:
```
@prefix pbac: <https://w3id.org/pbac#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<> a pbac:DynamicRule;
  acl:mode acl:Read ;
  rdfs:comment "Allows employees of offices that participate in the project to READ the resources of interest.";
  pbac:visitorRequirement <{url-to-visitor-requirement}> ;
  pbac:resourceRequirement <{url-to-resource-requirement}> .
```

9. **Create Authority**
  - **Method**: POST
  - **Endpoint**: `/authority`
  - **Description**: Create an authority.
  - **Headers**: Authorization (Bearer token, required)
  - **URL Params**: None
  - **Body (required)**:
    ```
    {
      type, # "https://w3id.org/consolid#ExplicitAuthority" or "https://w3id.org/consolid#ImplicitAuthority"
      "webId" # if ExplicitAuthority, the WebId must be provided
      "issuerRequirement": # if ImplicitAuthority, the issuer requirement must be provided (who can be trusted on this authority?)
    }
    ```
  - **Success Response**: 201 Created - Content: `Distribution URL`

10. **Add Authority to Requirement**
  - **Method**: POST
  - **Endpoint**: `/:requirementId/authority`
  - **Description**: Add an authority to a requirement. 
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**: `requirementId` (required) - The ID of the requirement, which will resolve to the Pod associated with the satellite.
  - **Body (required)**:
    ```
    {
      authorityURI" # the URI of the authority to add
    }
    ```
  - **Success Response**: 201 Created

11. **Create Requirement**
  - **Method**: POST
  - **Endpoint**: `/requirement`
  - **Description**: Create a requirement (VisitorRequirement or ResourceRequirement or IssuerRequirement).
  - **Headers**: Authorization (Bearer token, optional)
  - **Body (required)**: Requirement file
  - **Success Response**: 201 Created - Content: `Distribution URL`

An example VisitorRequirement (or IssuerRequirement) is:

```
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix pbac: <https://w3id.org/pbac#> .
@prefix consolid: <https://w3id.org/consolid#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<> a sh:NodeShape, pbac:VisitorRequirement, pbac:IssuerRequirement ;
  sh:targetClass pbac:Visitor, pbac:Issuer ;
  pbac:hasTrustedAuthority <{url-to-trusted-authority}> ;
  sh:property [
      sh:path ( consolid:participatesIn dcterms:identifier );
      # an agreed-upon identifier for the project, only used for validation
      sh:hasValue "{dcterms:identifier-of-project}" ;
  ] .
```

An example ResourceRequirement is:
```
@prefix pbac: <https://w3id.org/pbac#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

<> a pbac:ResourceRequirement ;
  rdfs:comment "The resource must be a dataset or distribution in the project with ID ${pm.environment.get('ACTIVE_PROJECT')}" ;
  pbac:askQuery """PREFIX dcat: <http://www.w3.org/ns/dcat#>
  ASK WHERE {
      {<{url-of-the-project}> dcat:dataset+ $resource$}
      UNION 
      {<{url-of-the-project}> dcat:dataset+/dcat:distribution/dcat:accessURL $resource$}
      }""" .
```

12. **PBAC Interaction**
  - **Method**: GET / POST / PUT / DELETE
  - **Endpoint**: `/pbac`
  - **Description**: Perform PBAC interaction to get a resource with PBAC.
  - **Headers**:
    - Authorization (Bearer token, optional)
    - PBAC (JWT token, optional (signed certificate, e.g. created with /sign)) (multiple PBAC headers can be provided, with different certificates)
  - **Query Params**:
    - `resource` (required) - The URL of the resource to access.
  - **Success Response**: 200 OK - Content: Resource content
  - **Error Response**: None


### Reference Registry API Documentation

1. **Create Reference Collection**
  - **Method**: POST
  - **Endpoint**: `/:registryId/referencecollection`
  - **Description**: Create a reference collection.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**: registryId` (required) - The ID of the reference registry, which will resolve to the Pod associated with the satellite.
  - **Success Response**: 200 OK - Content: `Reference Collection URL` (The Reference Collection will not have any associated References yet)
`
2. **Create Reference**
  - **Method**: POST
  - **Endpoint**: `/:registryId/reference`
  - **Description**: Create a reference.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**:
    - `registryId` (required) - The ID of the reference registry.
  - **Body (required)**:
    {
      referenceCollection, # optional, if not provided, a new Reference Collection will be created with a random GUID
      conformsTo, # the standard to which the identifier conforms
      identifier, # the sub-document identifier
      source # the source (distribution) of the identifier
    }
    ```
  - **Success Response**: 201 Created - Content: `Reference URL`

3. **Create Alias**
  - **Method**: POST
  - **Endpoint**: `/:registryId/alias`
  - **Description**: Create an alias.
  - **Headers**: Authorization (Bearer token, optional)
  - **URL Params**: `registryId` (required) - The ID of the reference registry.
  - **Body (required)**:
    ```
    {
      referenceCollection # (required) the URL of the Reference Collection to which the alias is added
      alias # (required) the URL of the alias
    }
    ```
  - **Success Response**: 201 Created - Content: Alias URL


### Inbox API Documentation
The Inbox API is a highly experimental set of endpoints, related to an LDP inbox. It acts as a protection layer to an inbox, only allowing messages adhering to a certain shape or format. 

1. **Post Message**
  - **Method**: POST
  - **Endpoint**: `/inbox`
  - **Description**: Post a message to the inbox of the owner of the satellite.
  - **Headers**: Authorization (Bearer token, optional)
  - **Body (required)**:
    ```
    {
      message, # valid turtle message (shape checking not implemented yet)
      type # currently only: "http://w3id.org/conSolid/ProjectCreation" or "http://w3id.org/conSolid/ProjectAggregation"
    }
    ```
  - **Success Response**: 200 OK - Content: "Message received"

2. **Get Messages**
  - **Method**: GET
  - **Endpoint**: `/inbox`
  - **Description**: Get messages from the inbox.
  - **Headers**: Authorization (Bearer token, optional)
  - **Query Params**:
    - `unread` (optional) - Filter unread messages (boolean).
    - `topic` (optional) - Filter messages by foaf:primaryTopic (string).
  - **Success Response**: 200 OK - Content: List of messages