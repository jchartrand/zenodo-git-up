import { buildBibliography, getExistingCachedBibliography } from "./buildBibliography";
import  { updateDOIinDoc, addRespStmt, addRevision } from "./xmlUtils"
import {createDOIDeposition, uploadFilesToDeposition, addMetadata} from "./zenodo"
import createPDF from "./createPDF"
import vkbeautify from 'vkbeautify'
import $ from 'jquery';
const Octokit = require("@octokit/rest");
const github = new Octokit({
		accept: 'application/vnd.github.v3.text-match+json',
		'user-agent': 'octokit/rest.js v1.2.3' // v1.2.3 will be current version
});
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

	async function handleSubmit(event) {
		event.preventDefault();
		getFiles()
	}

	function processFiles(files, fonts){

		files.data.forEach(file=>{
			if (file.name.endsWith('.xml') && file.name.startsWith('ISic1176')) {
				fetch(file.download_url)
					.then(response => response.text())
					.then(result => {
						try {

							processFile(result, fonts)
						} catch (e) {
							console.log(`some problem with the file: ${file}`)
							console.log(e)
						}
					})
			}
		})
	}


	async function processFile(xmlText, fonts) {
		let xmlDoc = parser.parseFromString(xmlText)
		let isicilyId = select("string(//tei:publicationStmt/tei:idno[@type='filename'])", xmlDoc)

		let deposition = await createDOIDeposition();
		let doi = deposition.metadata.prereserve_doi.doi
		let pdf = await createPDF(xmlDoc, doi, date, xmlText, fonts)
		updateDOIinDoc(doi, xmlDoc)
		addRespStmt(xmlDoc)
		addRevision(xmlDoc, date)
		let xmlString = vkbeautify.xml(serializer.serializeToString(xmlDoc))
		let pdfUploadResult = await uploadFilesToDeposition(deposition.links.bucket, `${isicilyId}.pdf`, pdf)
		let xmlUploadResult = await uploadFilesToDeposition(deposition.links.bucket, `${isicilyId}.xml`, xmlString)
		let addMetadataResult = await addMetadata(deposition)
		// need a publish call here
		saveTEIFileToGithub(xmlString)
	}



	function saveTEIFileToGithub(xmlString) {
		//window.alert("still need to save TEI file back to GITHUB");
		// save the xmlString back to master.
		// not sure where to put the pdfs.  maybe in a new directory.  maybe even in a different repository.
		//console.log(xmlString)
	}

	async function getFont(fontName) {
		return await fetch(`../fonts/${fontName}.ttf`).then(res => res.arrayBuffer())
	}
	async function getFiles() {
		console.log("in get Files")

		let fonts =  new Map();
		['NotoSans-Regular', 'NotoSans-SemiBold'].forEach(async (fontName)=>{
			let font = await getFont(fontName)
			fonts.set(fontName,font)
		})

		let files = await github.repos.getContents({owner: 'jchartrand', repo: 'myTest', path: '/'})
		processFiles(files, fonts)
	}

$('#processFiles').click(getFiles)
