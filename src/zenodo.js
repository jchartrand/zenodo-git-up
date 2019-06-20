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
		.then(response=>{console.log(response.links.html); return response})


}


function uploadFilesToDeposition(bucketURI, filename, content, zenodoToken) {

	//https://sandbox.zenodo.org/api/deposit/depositions/274625/files
	return fetch(`${bucketURI}/${filename}?access_token=${zenodoToken}`, {
		method: 'PUT',
		body: content
	})
}

function addMetadata(deposition, isicilyId, zenodoToken, useSandbox) {
	let data = {
		'metadata': {
			...deposition.metadata,
			'doi': deposition.metadata.prereserve_doi.doi,
			'access_right': 'open',
			'license': 'CC-BY-4.0',
			'title': isicilyId,
			'upload_type': 'dataset',
			'description': 'I.Sicily inscription.',
			'creators': [{
				'name': 'Prag, Jonathan',
				'affiliation': 'Oxford University'
			}]
		}
	}

	return fetch(`https://${useSandbox?ZENODO_BASE_URI_SANDBOX:ZENODO_BASE_URI_LIVE}/api/deposit/depositions/${deposition.id}?access_token=${zenodoToken}`, {
		method: 'PUT',
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(data)
	})
}


function publish(deposition, zenodoToken, useSandbox) {
	return fetch(`https://${useSandbox?ZENODO_BASE_URI_SANDBOX:ZENODO_BASE_URI_LIVE}/api/deposit/depositions/${deposition.id}/actions/publish?access_token=${zenodoToken}`, {
		method: 'POST'
	})
		//.then(response=>console.log(response))

}


export {createDOIDeposition, uploadFilesToDeposition, addMetadata, publish}
