const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});

function updateDOIinDoc(doi, xmlDoc) {
	let doiIdno = select("//tei:publicationStmt/tei:idno[@type='DOI']", xmlDoc)
	if (! doiIdno.length) {
		let pubStmt = select("//tei:publicationStmt", xmlDoc)[0]
		let newIdNo = xmlDoc.createElement('idno')
		newIdNo.setAttribute('type', 'DOI')
		newIdNo.appendChild(xmlDoc.createTextNode(doi))
		pubStmt.appendChild(newIdNo)
	} else {
		// NEED TO TEST THIS.
		doiIdno.textContent = doi;
	}
}

function addRespStmt(xmlDoc) {
	// NEED TO TEST, ESPCIALLY THAT ATTIRBUTES ARE PROPERLY SET.
	let respStmt = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:respStmt[text()='system']", xmlDoc)
	if (! respStmt.length) {
		let titleStmt = select("//tei:titleStmt", xmlDoc)[0]
		let newRespStmt = xmlDoc.createElement('respStmt')
		let newName = xmlDoc.createElement('name')
		let newResp = xmlDoc.createElement('resp')
		newName.setAttribute('xml:id', 'system')
		newName.appendChild(xmlDoc.createTextNode('system'))
		newResp.appendChild(xmlDoc.createTextNode('automated or batch processes'))
		newRespStmt.appendChild(newName)
		newRespStmt.appendChild(newResp)
		titleStmt.appendChild(newRespStmt)
	}
}

function addRevision(xmlDoc, date) {
	// NEED TO TEST, ESPECIALLY THAT ATTRIBUTES ARE PROPERLY SET.
	let revisionChangeList = select("//tei:revisionDesc/tei:listChange", xmlDoc)[0]
	let newChange = xmlDoc.createElement('change')
	newChange.setAttribute('when', date)
	newChange.setAttribute('who', 'system')
	newChange.appendChild(xmlDoc.createTextNode('Updated Zenodo DOI'))
	revisionChangeList.appendChild(newChange)
}

export { updateDOIinDoc, addRespStmt, addRevision}
