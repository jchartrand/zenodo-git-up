const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
const DOMParser = require('xmldom').DOMParser;
const parser = new DOMParser({
	locator:{},
	errorHandler:{
		error: msg => {throw new Error(msg)}
	}
});

function addDOIToDoc(doi, xmlDoc, date) {
	//let doiIdno = select("//tei:publicationStmt/tei:idno[@type='DOI']", xmlDoc)
	//if (! doiIdno.length) {
		let pubStmt = select("//tei:publicationStmt", xmlDoc, true)
		let availabilityElem = select("//tei:publicationStmt/tei:availability", xmlDoc, true)
		//let newIdnoXML = `<idno type="DOI">${doi}</idno>\n${' '.repeat(16)}`
		//let newIdNo = parser.parseFromString(newIdnoXML)
		let newIdNo = xmlDoc.createElement('idno')
		newIdNo.setAttribute('type', 'DOI')
		newIdNo.setAttribute('when', date)
		newIdNo.appendChild(xmlDoc.createTextNode(doi))
		pubStmt.insertBefore(newIdNo, availabilityElem)
		pubStmt.insertBefore(xmlDoc.createTextNode(`\n${' '.repeat(16)}`),availabilityElem)
//	} else {
	//	doiIdno[0].textContent = doi;
	//}
}

function addISicilyIdToDoc(isicilyId, xmlDoc) {
	let idno = select("//tei:publicationStmt/tei:idno[@type='URI']", xmlDoc)
	if (! idno.length) {
		let availabilityElem = select("//tei:publicationStmt/tei:availability", xmlDoc, true)
		let pubStmt = select("//tei:publicationStmt", xmlDoc, true)
		//let newIdnoXML = `<idno type="URI">http://sicily.classics.ox.ac.uk/inscription/${isicilyId}</idno>\n${' '.repeat(16)}`
		//let newIdNo = parser.parseFromString(newIdnoXML)
		let newIdNo = xmlDoc.createElement('idno')
		newIdNo.setAttribute('type', 'URI')
		newIdNo.appendChild(xmlDoc.createTextNode(`http://sicily.classics.ox.ac.uk/inscription/${isicilyId}`))
		pubStmt.insertBefore(newIdNo, availabilityElem)
		pubStmt.insertBefore(xmlDoc.createTextNode(`\n${' '.repeat(16)}`),availabilityElem)
	}
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
	newChange.setAttribute('who', 'system')
	newChange.appendChild(xmlDoc.createTextNode('Updated Zenodo DOI'))
	revisionChangeList.appendChild(xmlDoc.createTextNode('    '))
	revisionChangeList.appendChild(newChange)
	revisionChangeList.appendChild(xmlDoc.createTextNode(`\n${' '.repeat(12)}`))
}

export { addDOIToDoc, addRespStmt, addRevision, addISicilyIdToDoc}
