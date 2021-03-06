const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
const DOMParser = require('xmldom').DOMParser;
const parser = new DOMParser({
	locator:{},
	errorHandler:{
		error: msg => {throw new Error(msg)}
	}
});
const ISICILY_ID_BASE_URI = 'http://sicily.classics.ox.ac.uk/inscription/'

function addDOIToDoc(doi, xmlDoc, date) {

		let pubStmt = select("//tei:publicationStmt", xmlDoc, true)
		let availabilityElem = select("//tei:publicationStmt/tei:availability", xmlDoc, true)
		let newIdNo = xmlDoc.createElement('idno')
		newIdNo.setAttribute('type', 'DOI')
		newIdNo.setAttribute('when', date)
		newIdNo.appendChild(xmlDoc.createTextNode(doi))
		pubStmt.insertBefore(newIdNo, availabilityElem)
		pubStmt.insertBefore(xmlDoc.createTextNode(`\n${' '.repeat(16)}`),availabilityElem)

}

function addRespStmt(xmlDoc) {
	let respStmt = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:respStmt/tei:name[text()='system']", xmlDoc)
	if (! respStmt.length) {
		let titleStmt = select("//tei:titleStmt", xmlDoc)[0]
		let newRespStmt = xmlDoc.createElement('respStmt')
		let newName = xmlDoc.createElement('name')
		let newResp = xmlDoc.createElement('resp')
		newName.setAttribute('xml:id', 'system')
		newName.appendChild(xmlDoc.createTextNode('system'))
		newResp.appendChild(xmlDoc.createTextNode('automated or batch processes'))
		newRespStmt.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(20)}`))
		newRespStmt.appendChild(newName)
		newRespStmt.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(20)}`))
		newRespStmt.appendChild(newResp)
		newRespStmt.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(16)}`))
		titleStmt.appendChild(xmlDoc.createTextNode(' '.repeat(4)))
		titleStmt.appendChild(newRespStmt)
		titleStmt.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(12)}`))
	}
}

function addRevision(xmlDoc, date) {
	// NEED TO TEST, ESPECIALLY THAT ATTRIBUTES ARE PROPERLY SET.
	let revisionChangeList = select("//tei:revisionDesc/tei:listChange", xmlDoc)[0]
	let newChange = xmlDoc.createElement('change')
	newChange.setAttribute('when', date)
	newChange.setAttribute('who', '#system')
	newChange.appendChild(xmlDoc.createTextNode('Updated Zenodo DOI'))
	revisionChangeList.appendChild(xmlDoc.createTextNode('    '))
	revisionChangeList.appendChild(newChange)
	revisionChangeList.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(12)}`))
}

export { addDOIToDoc, addRespStmt, addRevision}
