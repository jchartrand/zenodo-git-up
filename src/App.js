import { buildCachedBibliography, getCachedBibliography } from "./bibliography";
import  { updateDOIinDoc, addRespStmt, addRevision, addISicilyIdToDoc } from "./xmlUtils"
import {createDOIDeposition, uploadFilesToDeposition, addMetadata, publish} from "./zenodo"
import createPDF from "./createPDF"
import vkbeautify from 'vkbeautify'
import $ from 'jquery';
global.jQuery = require("jquery")
require('multiselect')

const Octokit = require("@octokit/rest");
let github;
const DOMParser = require('xmldom').DOMParser;
const parser = new DOMParser({
	locator:{},
	errorHandler:{
		error: msg => {throw new Error(msg)}
	}
});
const XMLSerializer = require('xmldom').XMLSerializer;
const serializer = new XMLSerializer();
const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
console.log("loaded the apps.js")
const date = (new Date()).toISOString().substring(0, 10);
let githubOwner //= CONSTANTS.GITHUB_DATA_REPO_OWNER
let githubRepo //= CONSTANTS.GITHUB_DATA_REPO_NAME

	async function handleSubmit(event) {
		event.preventDefault();
		getFiles()
	}

Number.prototype.toTime = function(isSec) {
	var ms = isSec ? this * 1e3 : this,
		lm = ~(4 * !!isSec),  /* limit fraction */
		fmt = new Date(ms).toISOString().slice(11, lm);

	if (ms >= 8.64e7) {  /* >= 24 hours */
		var parts = fmt.split(/:(?=\d{2}:)/);
		parts[0] -= -24 * (ms / 8.64e7 | 0);
		return parts.join(':');
	}

	return fmt;
};



	async function processFiles(files, fonts, bibliography, zenodoToken, useSandbox){
		let totalPublished, totalFailed, totalDone;
		let startTime = Date.now()
		let totalFileCount = files.length
		for (const [i, file] of files.entries()) {
			// && file.path.startsWith('ISic1176')
			if (file.path.endsWith('.xml') ) {
				// && i < 3
				let itemId = `${file.path}-item`
				try {
					console.log(file)
					let resp = await github.git.getBlob({
						owner: githubOwner,
						repo: githubRepo,
						file_sha: file.sha
					})

					let decodedResp = Buffer.from(resp.data.content, 'base64').toString('utf8')
					let doi = await processFile(decodedResp, fonts, bibliography, file.sha, file.path, zenodoToken, useSandbox)

					$('#publishedList').append(`<li id="${itemId}" class="list-group-item">${file.path} -- <a href="${doi}">${doi}</a></li>`)

				} catch (e) {
					console.log(`Problem with file ${file.path}: ${e}`);
					$('#failedList').append(`<li id="${itemId}" class="list-group-item">${file.path} -- error:  ${e.toString().slice(0,30)}</li>`)

				}
				$('#elapsedTime').html(`Elapsed Time:  ${(Date.now() - startTime).toTime()}`)
				totalPublished = $("#publishedList li").length
				totalFailed = $("#failedList li").length
				totalDone = totalPublished + totalFailed


				$('#totalSucceeded').html(`<b>Published:</b> ${totalPublished}`);
				$('#totalFailed').html(`<b>Failed:</b> ${totalFailed}`);
				$('#status').html(`<b>Status:</b> Finished ${totalDone} of ${totalFileCount}`);

				document.getElementById(itemId).scrollIntoView()
			}
		}



		document.getElementById('publishedList').scrollIntoView()

	}

	async function processFile(xmlText, fonts, bibliography, sha, path, zenodoToken, useSandbox) {
		let xmlDoc = parser.parseFromString(xmlText)
		let isicilyId = select("string(//tei:publicationStmt/tei:idno[@type='filename'])", xmlDoc)

		 let deposition = await createDOIDeposition(zenodoToken, useSandbox);
		 let doi = deposition.metadata.prereserve_doi.doi
		let pdf = await createPDF(xmlDoc, doi, date, xmlText, fonts, bibliography)
		addISicilyIdToDoc(isicilyId, xmlDoc)
		updateDOIinDoc(doi, xmlDoc)
		addRespStmt(xmlDoc)
		addRevision(xmlDoc, date)
		let xmlString = serializer.serializeToString(xmlDoc)
		let pdfUploadResult = await uploadFilesToDeposition(deposition.links.bucket, `${isicilyId}.pdf`, pdf, zenodoToken)
		let xmlUploadResult = await uploadFilesToDeposition(deposition.links.bucket, `${isicilyId}.xml`, xmlString, zenodoToken)
		let addMetadataResult = await addMetadata(deposition, isicilyId, zenodoToken, useSandbox)
		await publish(deposition, zenodoToken, useSandbox)
		await saveTEIFileToGithub(xmlString, sha, path)
		return deposition.links.html;
	}



	async function saveTEIFileToGithub(xmlString, sha, fileName) {
		let path = `inscriptions/${fileName}`
		let content = Buffer.from(xmlString).toString('base64')
		let message = "updated DOI"
		//let branch = "master"
		await github.repos.updateFile({owner: githubOwner, repo: githubRepo, path, message, content, sha})
			.then(result=>{},
					error=>{console.log(`Problem saving file ${path} back to the Github repository: ${error}`)})
	}

	async function getFont(fontName) {
		return await fetch(`../fonts/${fontName}.ttf`).then(res => res.arrayBuffer())
	}
	async function doUpload() {
		let zenodoToken = $('#zenodoToken').val()
		let useSandbox = document.getElementById("useSandbox").checked

		$('#processFiles').html('Uploading').append('<span style="margin-left:2em" id="loadingSpinnerUpload" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')

		let bibliography = await getCachedBibliography()

		let files = Array.from(document.getElementById("my-select").selectedOptions).map(item=>{return{'path': item.text, 'sha': item.value}})

		let fonts =  new Map();
		['NotoSans-Regular', 'NotoSans-SemiBold', 'NotoSans-Italic'].forEach(async (fontName)=>{
			let font = await getFont(fontName)
			fonts.set(fontName,font)
		})

		await processFiles(files, fonts, bibliography, zenodoToken, useSandbox)

		$('#loadingSpinnerUpload').remove()
		$('#processFiles').html('Upload Selected Records to Zenodo')

	}

	function initializeGithub() {
		if (!github) {
			const githubToken = $('#githubToken').val()
			github = new Octokit({
				accept: 'application/vnd.github.v3.text-match+json',
				'user-agent': 'octokit/rest.js v1.2.3', // v1.2.3 will be current version
				auth: `token ${githubToken}`
			});
			githubRepo = $('#githubRepo').val()
			githubOwner = $('#githubOwner').val()
		}
	}
	async function listFiles() {

		initializeGithub()

		$('#listFiles').html('Loading').append('<span style="margin-left:2em" id="loadingSpinnerFiles" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')

		let repoContents = await github.repos.getContents({owner: githubOwner, repo: githubRepo, path: '/'})
		let treeSHA = repoContents.data.find(entry=>entry.path === 'inscriptions').sha
		let files = await getFilesFromTree(treeSHA)
		files.forEach((file,i)=>{
			$('#my-select').multiSelect('addOption', { value: file.sha, text: file.path, index: i });
		})
		$('#loadingSpinnerFiles').remove()
		$('#listFiles').html('Get Inscription List from Github')

	}

	async function getFilesFromTree(treeSHA) {
		let githubResponse = await github.gitdata.getTree(
			{
				owner: githubOwner,
				repo: githubRepo,
				tree_sha: treeSHA
			}
		)
		return githubResponse.data.tree
	}

	async function refreshBibliography() {
		const githubToken = $('#githubToken').val()
		buildCachedBibliography(githubToken)
	}

$('#my-select').multiSelect({
	selectableHeader: "<div class='custom-header'>Selectable inscriptions</div>",
	selectionHeader: "<div class='custom-header'>Selected inscriptions</div>"
})

$('#buildBibl').click(refreshBibliography)
$('#listFiles').click(listFiles)
$('#processFiles').click(doUpload)

$('#select-all').click(function(){
	$('#my-select').multiSelect('select_all');
	return false;
});
$('#deselect-all').click(function(){
	$('#my-select').multiSelect('deselect_all');
	return false;
});

