# Reproduction of PBAC access control
The PBAC framework is a framework for access control in the context of Linked Data. It is based on the [W3C Web Access Control](https://www.w3.org/wiki/WebAccessControl) specification. It is integrated in the ConSolid ecosystem, but may function independently. The ConSolid prototype provides an experimental endpoint where Pattern-based Access Control is supported. This demo is based on the project created in the [CONSOLID demo](../CONSOLID/Readme.md), i.e., the duplex project. The following steps should have been completed before starting this demo:

- create the infrastructure
- create the federated project
- upload the datasets

## Creation of the PBAC Rules and Authorities
This step creates the pbac:DynamicRule "everyone who can proof they are part of the "duplex" project can GET resources belonging to this project" on the vault of the engineer. There are 2 explicitly trusted authorities: the owner and the engineer. There is also an implicit authority in this example: WebIds of whom it is proven that they are part of the "duplex" project, may issue the same kind of certificates. In a real world example, this would be more complicated, but for the demo, it suffices. 
- `cd PBAC/actions`
- `ts-node .\pbac.ts`

## Test the PBAC Rules
This step tests the PBAC rules by one of the architect employees, Bob, trying to access the 3D gltf model on the vault of the engineer. With his request, Bob submits 2 certificates:
- a certificate that the architect (architect-duplex) is part of the "duplex" project, signed by the owner (owner-duplex, explicit authority)
- a certificate that bob is part of the "duplex" project, signed by the architect (architect-duplex, implicit authority)

The request is sent to the vault of the engineer, who will check the signature of the certificates, as well as their content and whether the issuers have the authority to make these statements. If all checks pass, the ConSolid satellite of the engineer will return the requested resource.
- `ts-node .\checker.ts`