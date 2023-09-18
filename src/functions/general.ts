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


export {queryWithComunica, querySparqlStore}

