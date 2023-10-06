import {fetch} from 'cross-fetch';
import { IDataSource, IQueryEngine, Bindings, BindingsStream } from '@comunica/types';

interface Options {
    quads?: boolean;
}

async function queryWithComunica(myEngine  : IQueryEngine, query: string, sources : [IDataSource, ...IDataSource[]], {quads} : Options = {quads: false}): Promise<Bindings[]> {
    const result = await myEngine.queryBindings(query, {sources, fetch: session.fetch});
        const data: Bindings[] = await result.toArray()
        return data;
}

async function querySparqlStore(query:string, endpoint: string) {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    myHeaders.append("Authorization", session.bearer);
    let urlencoded = new URLSearchParams();
    urlencoded.append("query", query)
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
    };

    const results = await session.fetch(endpoint, requestOptions)
    .catch((error: any) => {console.log('error :>> ', error);});
    if (Object.keys(results).length !== 0) return await results.json() 
    else return false
}

// sparql update function via REST API
async function sparqlUpdateViaRESTAPI(resourceUrl: string, updateQuery: string, authFetch: any) {
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
export {queryWithComunica, querySparqlStore, sparqlUpdateViaRESTAPI}

