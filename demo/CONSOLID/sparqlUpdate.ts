import fetch from 'cross-fetch'

// sparql update function via REST API
export async function sparqlUpdateViaRESTAPI(resourceUrl: string, updateQuery: string, authFetch: any) {
    let response
    // if authfetch is not a function but a string
    if (typeof authFetch === 'string') {
        const token = authFetch
        const requestOptions: any = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/sparql-update',
                'Authorization': token
            },
            body: updateQuery,
            redirect: 'follow'
        };
        response = await fetch(resourceUrl, requestOptions)
    } else {
        response = await authFetch(resourceUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/sparql-update'
    
            },
            body: updateQuery
        });
    
    }

    return response;
}