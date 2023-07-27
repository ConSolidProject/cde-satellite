// sparql update function via REST API
export async function sparqlUpdateViaRESTAPI(resourceUrl: string, updateQuery: string, authFetch: any) {
    const response = await authFetch(resourceUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/sparql-update'
        },
        body: updateQuery
    });
    return response;
}