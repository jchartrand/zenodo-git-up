//import * as jsPDF from "jspdf";
const PDFDocument = require('pdfkit');
const blobStream  = require('blob-stream');
const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
import printLeiden from './leidenGenerator'

async function createPDF(xmlDoc, doi, date, xmlString, fonts) {

	return new Promise(function(resolve, reject) {




	//good sample to use:  http://sicily.classics.ox.ac.uk/inscription/ISic1175
	// image url:  http://sicily.classics.ox.ac.uk/inscription_images/ISic0007/ISic0007.jpg
	// where the ***.jpg part comes from the tei image element - (See the app/js/controllers/inscription-printable.js)
	//
	//NEXT:  start adding content (including bibl, and image) here using the xpath processor above.

	/*
			github gitlab/oxford/webapp/app/js/services/teiHelper.js
			has the Leiden building stuff.
	*/

	const isWhiteSpace = /(?:^\s+$)/

	const getDataUri= (isicilyId, imageFile) => {

		return new Promise(function(imageResolve, imageReject) {

			let image = new Image();
			image.crossOrigin="anonymous"
			image.onload = function () {
				var canvas = document.createElement('canvas');
				canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
				canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

				canvas.getContext('2d').drawImage(this, 0, 0);

				// Get raw image data
				//callback(canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, ''));
				// ... or get as Data URI
				//callback(canvas.toDataURL('image/png'));
				imageResolve(canvas.toDataURL('image/png'))
			};
			// `http://sicily.classics.ox.ac.uk/inscription_images/ISic0007/ISic0007.jpg`
			image.src =  `http://sicily.classics.ox.ac.uk/inscription_images/${isicilyId}/${imageFile}`;
		});
	}
	const getElementText = node => Array.from(node.childNodes)
		.filter(childNode=>childNode.nodeType === Node.TEXT_NODE)
		.map(textNode=>textNode.nodeValue)
		.filter(nodeText=>!isWhiteSpace.test(nodeText))
		.map(cleanedText=>cleanedText.trim())
		.join(' ')
		.trim()

	const joinAllValues = (items, separator)=> {
		let joinedString = items
			.map(item => getElementText(item))    // get all direct text, not descendant text
			.filter(v => v.trim() != '')            // remove any empty items
			.join(separator ? separator : ' / ')    // join all together
		return joinedString?joinedString:''         // return joined string or empty string if no values
	}

	const addSection = (title, text) => {
		addTitle(title)
		addText(text)
		pdfDoc.moveDown()
	}

/*
	const addSectionAsOneLine = (title, text) => {
		let offsetAfterTitle = pdfDoc.getTextWidth(title) + 12;
		pdfDoc.setFontType("bold");
		pdfDoc.text(title);
		pdfDoc.setFontType("normal");
		pdfDoc.text(offsetAfterTitle, y, text);
		y=y+7
	}
*/

	const addText = text => {
		//pdfDoc.setFontType("normal");
		//splitAndAddText(text)
		pdfDoc.font('NotoSans')
		pdfDoc.text(text)
	}

	const addTitle = text => {
		//pdfDoc.setFontType("bold");
		//splitAndAddText(text)
		pdfDoc.font('NotoSansBold')
		pdfDoc.text(text)
	}

	var pdfDoc = new PDFDocument();
	const stream = pdfDoc.pipe(blobStream());
	pdfDoc.registerFont('NotoSans', fonts.get('NotoSans-Regular'));
	pdfDoc.registerFont('NotoSansBold', fonts.get('NotoSans-SemiBold'));


		let isicilyId = select("string(//tei:publicationStmt/tei:idno[@type='filename'])", xmlDoc)
	let title = select("string(//tei:fileDesc/tei:titleStmt/tei:title)", xmlDoc)
	addSection(isicilyId, title)

	let language = joinAllValues(select("//tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msContents/tei:textLang", xmlDoc))
	addSection('Language', language)

	let type = joinAllValues(select("//tei:profileDesc/tei:textClass/tei:keywords/tei:term", xmlDoc))

	addSection('Type', type)

	let material = joinAllValues(select("//tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:material", xmlDoc))
	addSection('Material', material)

	let objectType = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:objectType", xmlDoc))
	addSection('Object', objectType)

	let editor = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:editor", xmlDoc), ',')
	addSection('Editor', material)

	let principalContributor = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:principal", xmlDoc), ',')
	addSection('Principal Contributor', principalContributor)

	let contributors = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:respStmt/tei:name", xmlDoc), ',')
	addSection('Contributors', contributors)

	let autopsy = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:provenance[@subtype='autopsied']", xmlDoc))
	addSection('Autopsy', autopsy)

	let lastChange = select("tei:TEI/tei:teiHeader/tei:revisionDesc/tei:listChange/tei:change", xmlDoc).
	reduce((finalChange,change)=>
		finalChange.getAttribute('when') <= change.getAttribute('when')
			? change : finalChange ).textContent
	addSection('Last Change', lastChange)

	let originAncientOffset = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:origin/tei:origPlace/tei:offset[tei:placeName[@type='ancient']]", xmlDoc), ' ')
	let originModernOffset = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:origin/tei:origPlace/tei:offset[tei:placeName[@type='modern']]", xmlDoc), ' ')

	let originAncient = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:origin/tei:origPlace//tei:placeName[@type='ancient']", xmlDoc), ' ')
	let originModern = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:origin/tei:origPlace//tei:placeName[@type='modern']", xmlDoc), ' ')
	addSection('Place of origin (ancient)', `${originAncientOffset} ${originAncient}`)
	addSection('Place of origin (modern)', `${originModernOffset} ${originModern}`)

	let provenance = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:provenance[@type='found']", xmlDoc), ' ')
	addSection('Provenance', provenance)

	let coordinates = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:provenance[@type='found']/tei:geo)", xmlDoc)
	addSection('Coordinates', coordinates)

	let country = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:country)", xmlDoc)
	let region = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:region)", xmlDoc)
	let settlement = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:settlement)", xmlDoc)
	let repository = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:repository", xmlDoc), ' ')
	let idno = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:idno[@type='inventory'])", xmlDoc)

	let currentLocation = `${country}${region?', '+region:''}${settlement?', '+settlement:''}${repository?', '+repository:''}${idno?', inventory '+idno:''}`
	addSection('Current Location', currentLocation)

	let physicalDesc = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:p)", xmlDoc)
	addSection('Physical Description', physicalDesc)

	let height = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:height)", xmlDoc)
	let width = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:width)", xmlDoc)
	let depth = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:depth)", xmlDoc)

		pdfDoc.text(`Height ${height}`)
	pdfDoc.text(`Width ${width}`)
	pdfDoc.text(`Depth ${depth}`)
		pdfDoc.moveDown()

	let layout = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:layoutDesc/tei:layout/tei:p)", xmlDoc)
	addSection('Layout', layout)

	let execution = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:layoutDesc/tei:layout/tei:rs[@type='execution'])", xmlDoc)
	addSection('Execution', execution)

	let letterForms = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:handDesc/tei:handNote/tei:p)", xmlDoc)
	addSection('Letter Forms', letterForms)

	//let letterHeights = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:physDesc/tei:handDesc/tei:handNote/tei:dimensions[@type='letterHeight'])", xmlDoc)
	//let interlineation = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:physDesc/tei:handDesc/tei:handNote/tei:dimensions[@type='interlinear'])", xmlDoc)

	let handNoteChildren = select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:handDesc/tei:handNote/*", xmlDoc)

	if (handNoteChildren && handNoteChildren.length) {
		if (handNoteChildren.find(node => node.localName === 'dimensions' && node.getAttribute('type') === 'letterHeight')) {
			addTitle('Letter heights:')
		}

		let locus;
		let showInterlinearTitle = true;
		handNoteChildren.forEach((node) => {
			if (node.localName === 'locus') {
				locus = node.firstChild.data
			} else if (node.localName === 'dimensions') {
				if (node.getAttribute('type') === 'interlinear' && showInterlinearTitle) {
					showInterlinearTitle = false;
					pdfDoc.moveDown()
					addTitle('Interlineation')
				}
				let heightElem = node.getElementsByTagName('height')[0]
				let height = getElementText(heightElem)
				let unit = heightElem.getAttribute('unit')
				addText(`${locus}: ${height} ${unit}`)
			}
		})
		pdfDoc.moveDown()
	}

	addTitle('Text')
		pdfDoc.font('NotoSans')
	printLeiden(xmlString, pdfDoc)
	pdfDoc.moveDown()

	let apparatus = select("tei:TEI/tei:text/tei:body/tei:div[@type='apparatus']/tei:listApp/tei:app/tei:note", xmlDoc)
	addTitle('Apparatus')
	apparatus.forEach(node=>addText(getElementText(node)))
		pdfDoc.moveDown()

	// might want to instead get the P children and print them individually, if the node.textContent doesn't work
	let translations = select("tei:TEI/tei:text/tei:body/tei:div[@type='translation']", xmlDoc)
	translations.forEach(node=>{
		let langCode = node.getAttribute('xml:lang');
		let language;
		switch (langCode) {
			case 'en':
				language = 'English'
			case 'it':
				language = 'Italian'
			case 'fr':
				language = 'French'
			case 'de':
				language = 'German'
			default:
				language = langCode
		}
		addSection(`Translation (${language})`, node.textContent.trim())
	})


	// this will only work if there is a single p.  Or will it?
	let commentary = select("string(tei:TEI/tei:text/tei:body/tei:div[@type='commentary'])", xmlDoc)
	addSection('Commentary',commentary.trim())

	//	let imgData = await this.getDataUri('http://sicily.classics.ox.ac.uk/inscription_images/ISic0007/ISic0007.jpg')

	let idnos = select("//tei:publicationStmt/tei:idno[@type!='filename' and text()]", xmlDoc)
	addTitle('Digital identifiers:')
	idnos.forEach(node=>{
		addText(node.getAttribute('type') + getElementText(node))
	})
		pdfDoc.moveDown()

	//<graphic n="print" url="ISic1176.jpg" height="3516px" width="7151px">

	//let imageFile = select("//tei:graphic[@n='print']/url")
	let availability = select("string(//tei:publicationStmt/tei:availability/tei:licence)", xmlDoc)
	addText(availability)

	let citeAs = `J. Prag et al. ${date}. ‘${isicilyId}’, DOI: ${doi}`
	addSection('Cite as:', citeAs)


	//pdfDoc.addImage(getDataURI(), 'JPEG', 15, 40, 180, 160)

		// this is for ease of checking:
	//pdfDoc.save(`${isicilyId}t.pdf`)
	//return pdfDoc.output('arraybuffer')
		pdfDoc.end();

	stream.on('finish', function() {
		// get a blob you can do whatever you like with
		let blob = stream.toBlob('application/pdf');
		resolve(blob)
	});
	});
}

export default createPDF
