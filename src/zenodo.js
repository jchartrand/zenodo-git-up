const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
const ZENODO_BASE_URI_LIVE = 'zenodo.org'
const ZENODO_BASE_URI_SANDBOX = 'sandbox.zenodo.org'

function createDOIDeposition(zenodoToken, useSandbox) {

	return fetch(`https://${useSandbox?ZENODO_BASE_URI_SANDBOX:ZENODO_BASE_URI_LIVE}/api/deposit/depositions?access_token=${zenodoToken}`, {
		method: 'POST',
		headers: {
			"Content-Type": "application/json",
			// "Content-Type": "application/x-www-form-urlencoded",
		},
		body: '{}'
	})
		.then(response=>response.json())
		.then(response => {
			if (response.status == 400) { throw 'Adding metadata failed.' }
			else {
				return response;
			}
	})
		.then(response=>{console.log(response.links.html); return response})

}


function uploadFilesToDeposition(bucketURI, filename, content, zenodoToken) {

	//https://sandbox.zenodo.org/api/deposit/depositions/274625/files
	return fetch(`${bucketURI}/${filename}?access_token=${zenodoToken}`, {
		method: 'PUT',
		body: content
		//  might need to first convert the response to json.
	}).then(response => {
		if (response.status == 400) {
			throw 'Uploading files failed.'
		} })
}

function addMetadata(deposition, isicilyId, zenodoToken, useSandbox, xmlDoc) {
	//let isicilyId = select("string(//tei:publicationStmt/tei:idno[@type='filename'])", xmlDoc)
	let uri = select("string(//tei:publicationStmt/tei:idno[@type='URI'])", xmlDoc)
	let title = select("string(//tei:fileDesc/tei:titleStmt/tei:title)", xmlDoc)
	let respStmtNames = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:respStmt/tei:name[. != 'system']", xmlDoc);
	let contributors = respStmtNames.map(contributor=>{
		let orcid = contributor.getAttribute('ref')
		let name = contributor.textContent
		let type = name=='Jonathan Prag'?'ProjectLeader':'ProjectMember'
		return orcid?{name, type, orcid}:{name, type}
	})
	let publicationDate = select("tei:TEI/tei:teiHeader/tei:revisionDesc/tei:listChange/tei:change", xmlDoc).reduce((finalChange, change) =>
		(change.textContent !== 'Updated Zenodo DOI' && finalChange.getAttribute('when') <= change.getAttribute('when'))
			? change : finalChange).getAttribute('when')

	let data = {
		'metadata': {
			//...deposition.metadata,
			//'doi': deposition.metadata.prereserve_doi.doi,
			'access_right': 'open',
			//'license': 'CC-BY 4.0 https://creativecommons.org/licenses/by/4.0/',
			'license':'cc-by',
			'title': title,
			'upload_type': 'publication',
			'publication_type': 'other',
			'publication_date': publicationDate,
			'description': 'TEI EpiDoc record',
			'creators': [{
				'name': 'Prag, Jonathan',
				'orcid': 'http://orcid.org/0000-0003-3819-8537'
			}],
			'contributors': contributors,
			'keywords': ['Sicily', 'epigraphy'],
			'related_identifiers': [
				{
					'identifier': uri,
					'relation': 'isAlternateIdentifier'
				},
				{
					'identifier': 'http://sicily.classics.ox.ac.uk',
					'relation':'isPartOf'
				}
			],
			'subjects': [
				{
					'term': 'epigraphy',
					'identifier': 'http://vocab.getty.edu/page/aat/300138808'
					//'scheme': 'http://www.getty.edu/research/tools/vocabularies/aat/'
				},
				{
					'term': 'Sicily',
					'identifier': 'https://pleiades.stoa.org/places/462492'
					//'scheme': 'https://pleiades.stoa.org/'
				}
				]
		}
	}

	return fetch(`https://${useSandbox?ZENODO_BASE_URI_SANDBOX:ZENODO_BASE_URI_LIVE}/api/deposit/depositions/${deposition.id}?access_token=${zenodoToken}`, {
		method: 'PUT',
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(data)
		//  might need to first convert the response to json.
	}).then(response => {if (response.status == 400) {
		console.log('Some problem with the metadata:')
		console.log(data)
		throw 'Adding metadata failed.'
	}})
}


function publish(deposition, zenodoToken, useSandbox) {
	return fetch(`https://${useSandbox?ZENODO_BASE_URI_SANDBOX:ZENODO_BASE_URI_LIVE}/api/deposit/depositions/${deposition.id}/actions/publish?access_token=${zenodoToken}`, {
		method: 'POST'
	})
		.then(response => {
				//  might need to first convert the response to json.
			if (response.status == 400) throw 'Publishing failed.'
			console.log(response)
			console.log(deposition)
		}
		)

}


export {createDOIDeposition, uploadFilesToDeposition, addMetadata, publish}
