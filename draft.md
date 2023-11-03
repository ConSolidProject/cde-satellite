# ConSolid API

Welcome to the ConSolid API, an essential component of the ConSolid project, designed to facilitate multi-stakeholder, multi-industry collaborations in dealing with heterogeneous information snippets. 

In many industries, various parties collaborate on complex projects, with each stakeholder simultaneously participating in multiple independent projects. This creates a complex network of relationships between actors and collaborative projects, often resembling a double patchwork. A key example of such complexity is the construction industry, where unique projects involve specialists in various subdomains, including architectural design, technical installations, geospatial information, governmental regulations, and historical research. The challenge lies in representing these diverse processes and their outcomes digitally, requiring semantic interoperability among these subdomains, which often work with heterogeneous and unstructured data.

ConSolid addresses this challenge by offering a decentralized ecosystem for handling diverse information snippets in a collaborative environment. At its core, ConSolid leverages the Solid specifications for Web decentralization but extends them on both a (meta)data pattern level and a microservice level. To ensure robust data allocation and filtering, ConSolid introduces the concept of metadata-generated 'virtual views,' generated using an access-controlled SPARQL interface to a Pod. Additionally, it provides a scalable way to discover multi-vault aggregations and data patterns for connecting and aligning heterogeneous (RDF and non-RDF) resources across vaults in a media-type-agnostic fashion.

The ConSolid API serves as a primary example of how functional satellites streamline high-level interactions with data vaults within the ConSolid ecosystem. Data vaults primarily store data, and external validation is essential to ensure the storage structure aligns with the ConSolid requirements and PBAC access control extensions.

In many cases, clients interact with the higher-level API offered by the satellite, while the lower-level LDP interactions of a Solid server are utilized by the satellite for communication with the data vault. To ensure all interactions with a data vault occur via the satellite, full editing rights are typically assigned to the WebId used for satellite authentication. Other actors may have read access at most, including the vault owner.

A prototypical ConSolid satellite, implemented in NodeJS using the ExpressJS framework, is available on GitHub. You can discover it by linking the property `consolid:hasConSolidSatellite` to the WebId of the vault owner, similar to the discovery pattern of the SPARQL satellite.

Explore the ConSolid API to streamline interactions with data vaults and unlock the potential for seamless collaboration within the ConSolid ecosystem.


## Documentation

Explore the API documentation to learn about available endpoints, request parameters, and responses.

### Project API Documentation

1. Get All Projects

- GET /project/
- Description: Retrieve all projects.
- Headers: None
- URL Params: None
- Success Response:
  - Code: 200 OK
  - Content: [list of projects]
- Error Response:
  - Code: 404 Not Found
  - Content: { error: "No satellite found" }

2. Get Specific Project

- GET /project/:projectId
- Description: Retrieve a specific project by its ID.
- Headers: None
- URL Params:
  - projectId (required) - The ID of the project to retrieve.
- Success Response:
  - Code: 200 OK
  - Content: { project details }
- Error Response:
  - Code: 404 Not Found
  - Content: { error: "Project not found" }

3. Create New Project

- POST /project/create
- Description: Create a new project.
- Headers:
  - Authorization: Bearer token (required)
- Body (required):
  {
    "existingPartialProjects": [],
    "projectId": "string",
    "refRegId": "string",
    "metadata": {}
  }
- Success Response:
  - Code: 201 Created
  - Content: { "projectUrl": "new project URL" }
- Middleware:
  - checkOwnership - Verifies if the user has the right to create a project.

4. Delete Project

- DELETE /project/:projectId
- Description: Delete a specific project by its ID.
- Headers:
  - Authorization: Bearer token (required)
- URL Params:
  - projectId (required) - The ID of the project to delete.
- Query Params:
  - recursive (optional) - Flag to delete all related resources.
- Success Response:
  - Code: 204 No Content
- Error Response:
  - Code: 404 Not Found
  - Content: { error: "Project not found" }
- Middleware:
  - checkOwnership - Verifies if the user has the right to delete the project.

5. Get Project Datasets

- POST /project/:projectId/datasets
- Description: Retrieve datasets for a specific project.
- Headers:
  - Authorization: Bearer token (required)
- URL Params:
  - projectId (required) - The ID of the project for which datasets are being retrieved.
- Body (required):
  {
    "distributionFilter": "string",
    "datasetFilter": "string"
  }
- Success Response:
  - Code: 200 OK
  - Content: [list of datasets]
- Error Response:
  - Code: 404 Not Found
  - Content: { error: "Project not found" }

...




## Vault API Documentation

The ConSolid Vault API facilitates the management of data within the ConSolid ecosystem. It ensures that interactions with data vaults are streamlined and compliant with the ConSolid specifications. Below is the documentation for the available API routes.

### Vault Operations

These operations are intended for managing the vault and its contents, ensuring adherence to the ConSolid project's structure and standards.

#### Get Vault Information

- **GET** `/vault/info`
  - Description: Retrieves general information about the vault.
  - Response:
    - Status code: `200 OK`
    - Content: 
      ```json
      {
        "name": "ConSolid Data Vault",
        "description": "Central data repository within the ConSolid ecosystem",
        "version": "1.0.0"
      }
      ```

#### Create New Resource

- **POST** `/vault/resource`
  - Description: Creates a new resource within the vault.
  - Request Body: 
    - Content-Type: `application/json`
    - Content:
      ```json
      {
        "type": "ResourceType",
        "data": "..."
      }
      ```
  - Response:
    - Status code: `201 Created`
    - Content: 
      ```json
      {
        "message": "Resource created successfully.",
        "resourceId": "new_resource_id"
      }
      ```

#### List Resources

- **GET** `/vault/resources`
  - Description: Lists all resources available in the vault.
  - Response:
    - Status code: `200 OK`
    - Content: 
      ```json
      [
        {
          "resourceId": "resource_id_1",
          "type": "ResourceType"
        },
        {
          "resourceId": "resource_id_2",
          "type": "AnotherResourceType"
        }
      ]
      ```

### Access Control

The following endpoints are concerned with the management of access permissions for different actors within the ConSolid ecosystem.

#### Set Permissions

- **PUT** `/vault/permissions`
  - Description: Sets the permissions for a resource within the vault.
  - Request Body:
    - Content-Type: `application/json`
    - Content:
      ```json
      {
        "resourceId": "resource_id",
        "permissions": {
          "read": ["actor_webid_1"],
          "write": ["actor_webid_2"]
        }
      }
      ```
  - Response:
    - Status code: `200 OK`
    - Content:
      ```json
      {
        "message": "Permissions updated successfully."
      }
      ```

Please note that all routes are prefixed with the base URL of the API, which needs to be configured according to your deployment settings. For example, if your API is hosted at `https://api.consolid.org`, then the full URL for the `Get Vault Information` endpoint would be `https://api.consolid.org/vault/info`.

Before using the API, ensure that you have the necessary permissions and that you are authenticated as described in the authentication section.

For more detailed usage of each endpoint, refer to the full API reference (link to detailed API reference).

