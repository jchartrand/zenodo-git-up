import CONSTANTS from './Constants'
const Octokit = require("@octokit/rest");
const github = new Octokit({
	auth: `token ${CONSTANTS.TOKEN}`,
	accept: 'application/vnd.github.v3.text-match+json',
	'user-agent': 'octokit/rest.js v1.2.3' // v1.2.3 will be current version
});
//github.authenticate({type: "oauth",token: CONSTANTS.TOKEN})

const owner = CONSTANTS.ZENDOO_GIT_UP_OWNER
const repo = CONSTANTS.ZENODO_GIT_UP_REPO_NAME
const path = CONSTANTS.ZENODO_GIT_UP_REPO_BIBL_PATH

async function getFileSha() {
	const {data: {data: {repository: {object: result}}}} = await github.request({
		method: 'POST',
		url: '/graphql',
		query: `{
			repository(owner: "${owner}", name: "${repo}") {
				object(expression: "master:${path}") {
					... on Blob {
						oid
					}
				}
			}
		}`
	}).catch(function(error) {
		console.log(error);
	});
	const sha = result ? result.oid : null
	return sha
}

async function getExistingCachedBibliography() {

	let file_sha = await getFileSha();
	try {
		/*let biblFile = await github.repos.getContents({
			owner,
			repo,
			path
		})*/

		let biblBlob = await github.git.getBlob({
			owner,
			repo,
			file_sha
		})

		let biblFile =  decodeContent(biblBlob.data.content)

		return biblFile;
	} catch (err) {
		if (err.status === 404) {
			return null
		} else {
			throw new Error(`This went wrong: ${err}  Please try again.`)
		}
	}
}

async function buildBibliography() {
	let owner = CONSTANTS.ZENDOO_GIT_UP_OWNER
	let repo = CONSTANTS.ZENODO_GIT_UP_REPO_NAME
	let path = CONSTANTS.ZENODO_GIT_UP_REPO_BIBL_PATH

	let start = 0
	let bibliography = []
	let result
	do {
		let CONSTANTS = {ZOTERO_URL: 'https://api.zotero.org/groups/382445/items/top?v=3&key=Zj71WReVC5pbk3rQpK7aquU4&limit=100&start='}
		result = await fetch(`${CONSTANTS.ZOTERO_URL}${start}`)
			.then(response => response.json())
		bibliography = bibliography.concat(result)
		start = start + 100
	} while (result.length === 100)

	// STILL NEED TO ADD THE SPECIFIC REFERENCE FROM EACH INSCRIPTION TO THE END OF THE CHICAGO.
	// WILL DO THIS WHEN I BUILD THE PDF FOR EACH INSCRIPTION.

	var publicationsByKey = bibliography.reduce((pubsByKey, publicationData)=>{
		pubsByKey[publicationData.key] = publicationData;
		return pubsByKey
	}, Object.create(null))

	let existingBiblFileSHA = await getFileSha();

	existingBiblFileSHA
		? github.repos.updateFile({owner, repo, path, message: 'update bibl cache', sha:existingBiblFileSHA, content: encodeContent(JSON.stringify(publicationsByKey))})
		: github.repos.createFile({owner, repo, path, message: 'update bibl cache', content: encodeContent(JSON.stringify(publicationsByKey))})
}

function encodeContent(content) {
	return Buffer.from(content).toString('base64')
}

function decodeContent(encodedData) {
	return window.atob(encodedData)
	//return Buffer.from(content).toString('base64')
}

export { buildBibliography, getExistingCachedBibliography}
