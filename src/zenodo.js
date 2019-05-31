const ZENODO_TOKEN_TEST = '7ckG46vCRnntOwL8xXD6UEf2D2OEn7DXs9pVidKGEiSPZC7Kztc8xVSUV5tD'
const ZENODO_TOKEN_LIVE = 'BN8F4OghcsZE12O8BCXjwRApvtzHO5k3csDBKljxkWtCWWuoGXyaczlGotqP'
const ZENODO_TOKEN = ZENODO_TOKEN_TEST
const ZENODO_BASE_URI_LIVE = 'zenodo.org'
const ZENODO_BASE_URI_TEST = 'sandbox.zenodo.org'
const ZENODO_BASE_URI = ZENODO_BASE_URI_TEST

function createDOIDeposition() {
	return fetch(`https://${ZENODO_BASE_URI}/api/deposit/depositions?access_token=${ZENODO_TOKEN}`, {
		method: 'POST',
		headers: {
			"Content-Type": "application/json",
			// "Content-Type": "application/x-www-form-urlencoded",
		},
		body: '{}'
	})
		.then(response=>response.json())
		.then(response=>{console.log(response.links.html); return response})
	//	.then(json=>json.links.bucket)
	//	.then(body=>console.log(body))

}


function uploadFilesToDeposition(bucketURI, filename, content) {

	//https://sandbox.zenodo.org/api/deposit/depositions/274625/files
	return fetch(`${bucketURI}/${filename}?access_token=${ZENODO_TOKEN}`, {
		method: 'PUT',
		body: content
	})
}

function addMetadata(deposition) {
	let data = {
		'metadata': {
			...deposition.metadata,
			'doi': deposition.metadata.prereserve_doi.doi,
			'access_right': 'open',
			'title': 'My first upload',
			'upload_type': 'poster',
			'description': 'This is my first upload',
			'creators': [{
				'name': 'Doe, John',
				'affiliation': 'Zenodo'
			}]
		}
	}

	return fetch(`https://${ZENODO_BASE_URI}/api/deposit/depositions/${deposition.id}?access_token=${ZENODO_TOKEN}`, {
		method: 'PUT',
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(data)
	})
}

export {createDOIDeposition, uploadFilesToDeposition, addMetadata}
