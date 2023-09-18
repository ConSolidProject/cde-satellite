const $rdf = require('rdflib');

// Create an RDF Store

// Define the base URI for your RDF data

// Fetch and parse multiple Turtle files
async function fetchAndMergeTurtleGraphs(turtleURLs) {
    const store = $rdf.graph();
    const baseURI = 'http://example.org/';

    // Fetch and parse each Turtle file
  for (const url of turtleURLs) {
    const response = await fetch(url);
    const data = await response.text();

    // Parse Turtle data and add it to the store
    $rdf.parse(data, store, url, 'text/turtle');
  }

  // Serialize the merged graph back to Turtle format
  const mergedTurtle = $rdf.serialize(null, store, baseURI, 'text/turtle');

  // Print or save the merged Turtle data
  return mergedTurtle
}

export {fetchAndMergeTurtleGraphs}