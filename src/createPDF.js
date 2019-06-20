//import * as jsPDF from "jspdf";
const PDFDocument = require('pdfkit');
const blobStream  = require('blob-stream');
const xpath = require('xpath')
const select = xpath.useNamespaces({"tei": "http://www.tei-c.org/ns/1.0"});
import printLeiden from './leidenGenerator'
import addBibliography from './addBibliography'

async function createPDF(xmlDoc, doi, date, xmlString, fonts, bibliography) {

	const getDataUri = (isicilyId, imageFile) => {

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
			//image.src =  `http://sicily.classics.ox.ac.uk/inscription_images/${isicilyId}/${imageFile}`;
			image.src =  `../images/${imageFile}`;
		});
	}

	async function addImage(isicilyId, pdfDoc) {
		let image = select("//tei:graphic[@n='print']", xmlDoc, true)
		if (image) {
			let url = image.getAttribute('url')
			let imageDesc = image.getElementsByTagName('desc')
			let descText = imageDesc.length ? imageDesc[0].textContent.trim() : 'uncredited'
			console.log('url in addImage')
			console.log(url)
			let imageData = await getDataUri(isicilyId, url)
			pdfDoc.addPage().image(imageData, {fit: [450, 700], align: 'center', valign: 'top'})
			pdfDoc.moveDown()
			pdfDoc.text(descText)
			console.log("finished with adding image")
		}
	}

	return new Promise(async function(resolve, reject) {


		try {


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


			const getElementText = node => Array.from(node.childNodes)
				.filter(childNode => childNode.nodeType === Node.TEXT_NODE)
				.map(textNode => textNode.nodeValue)
				.filter(nodeText => !isWhiteSpace.test(nodeText))
				.map(cleanedText => cleanedText.trim())
				.join(' ')
				.trim()


			const joinAllValues = (items, separator) => {
				let joinedString = items
					.map(item => getElementText(item))    // get all direct text, not descendant text
					.filter(v => v.trim() != '')            // remove any empty items
					.join(separator ? separator : ' / ')    // join all together
				return joinedString ? joinedString : ''         // return joined string or empty string if no values
			}

			const addSection = (title, text) => {
				addTitle(title)
				addText(text)
				pdfDoc.moveDown()
			}

			const addText = text => {
				pdfDoc.font('NotoSans')
				pdfDoc.text(text)
			}

			const addTitle = text => {
				pdfDoc.font('NotoSansBold')
				pdfDoc.text(text)
			}

			var pdfDoc = new PDFDocument({size: 'A4'});
			const stream = pdfDoc.pipe(blobStream());
			pdfDoc.registerFont('NotoSans', fonts.get('NotoSans-Regular'));
			pdfDoc.registerFont('NotoSansBold', fonts.get('NotoSans-SemiBold'));
			pdfDoc.registerFont('NotoSansItalic', fonts.get('NotoSans-Italic'));


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
			addSection('Editor', editor)

			let principalContributor = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:principal", xmlDoc), ',')
			addSection('Principal Contributor', principalContributor)

			let contributors = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:respStmt/tei:name", xmlDoc), ',')
			addSection('Contributors', contributors)

			let autopsy = joinAllValues(select("tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:history/tei:provenance[@subtype='autopsied']", xmlDoc))
			addSection('Autopsy', autopsy)

			let lastChange = select("tei:TEI/tei:teiHeader/tei:revisionDesc/tei:listChange/tei:change", xmlDoc).reduce((finalChange, change) =>
				(change.textContent !== 'Updated Zenodo DOI' && finalChange.getAttribute('when') <= change.getAttribute('when'))
					? change : finalChange)
			addSection('Last Change', `${lastChange.getAttribute('when')} - ${lastChange.textContent}`)

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

			let currentLocation = `${country}${region ? ', ' + region : ''}${settlement ? ', ' + settlement : ''}${repository ? ', ' + repository : ''}${idno ? ', inventory ' + idno : ''}`
			addSection('Current Location', currentLocation)

			let physicalDesc = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:p)", xmlDoc)
			addSection('Physical Description', physicalDesc)

			let height = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:height)", xmlDoc)
			let width = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:width)", xmlDoc)
			let depth = select("string(tei:TEI/tei:teiHeader/tei:fileDesc/tei:sourceDesc/tei:msDesc/tei:physDesc/tei:objectDesc/tei:supportDesc/tei:support/tei:dimensions/tei:depth)", xmlDoc)

			addTitle("Dimensions")
			pdfDoc.font('NotoSans')
			pdfDoc.text(`Height ${height} cm`)
			pdfDoc.text(`Width ${width} cm`)
			pdfDoc.text(`Depth ${depth} cm`)
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
						if (node.firstChild && node.firstChild.data) {
							locus = node.firstChild.data
						} else {
							locus = `Line ${node.getAttribute('from')} to ${node.getAttribute('from')} `
						}
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
			apparatus.forEach(node => addText(getElementText(node)))
			pdfDoc.moveDown()

			// might want to instead get the P children and print them individually, if the node.textContent doesn't work
			let translations = select("tei:TEI/tei:text/tei:body/tei:div[@type='translation']", xmlDoc)
			translations.forEach(node => {
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
				language = language?`(${language})`:''
				addSection(`Translation ${language}`, node.textContent.trim())
			})

			const removeWhiteSpace = oldText => oldText.replace(/[\s\n\r]+/g, " ").trim()

			//oldText.replace(/\r?\n|\r/g, ' ')

			const getCommentaryText = (node) => {
				if (node.nodeName === 'ref') {
					let refAttr = node.getAttribute('target')
					let elementText = node.textContent;
					let newText = `${elementText}${refAttr ? ` [${refAttr}]` : ''}`
					return removeWhiteSpace(newText)
				} else if (node.nodeName = 'p' && node.hasChildNodes()) {
					return Array.from(node.childNodes).reduce((finalText, node) => `${finalText} ${getCommentaryText(node)}`, '') + '\n'
				} else if (node.nodeType === Node.TEXT_NODE) {
					return removeWhiteSpace(node.nodeValue)
				} else if (node.hasChildNodes()) {
					return Array.from(node.childNodes).reduce((finalText, node) => `${finalText} ${getCommentaryText(node)}`)
				}
				return ""
			}

			let commentaryNode = select("tei:TEI/tei:text/tei:body/tei:div[@type='commentary']", xmlDoc, true);
			commentaryNode
				? addSection('Commentary', getCommentaryText(commentaryNode).trim())
				: addSection('Commentary', 'No commentary')

			let idnos = select("//tei:publicationStmt/tei:idno[@type!='filename' and text()]", xmlDoc)
			addTitle('Digital identifiers:')
			idnos.forEach(node => {
				addText(`${node.getAttribute('type')} ${getElementText(node)}`)
			})
			pdfDoc.moveDown()

			addTitle('Bibliography')
			addBibliography(pdfDoc, xmlDoc, bibliography, select)
			pdfDoc.moveDown()

			let availability = select("string(//tei:publicationStmt/tei:availability/tei:licence)", xmlDoc)
			addText(availability)


			//	J. Prag et al. (2019-06-10): ISic1176. Version 1. http://sicily.classics.ox.ac.uk. (Collection: TEI edition). http://doi.org/10.5072/zenodo.295404

			let citeAs = `J. Prag et al. (${date}): ${isicilyId}. http://sicily.classics.ox.ac.uk. (Collection: TEI edition). http://doi.org/${doi}`
			addSection('Cite as:', citeAs)

			//let imgData = await this.getDataUri('http://sicily.classics.ox.ac.uk/inscription_images/ISic0007/ISic0007.jpg')

//	await addImage(isicilyId, pdfDoc);

			pdfDoc.end();

			stream.on('finish', function () {
				let blob = stream.toBlob('application/pdf');
				//saveAs(blob, 'MyFile.pdf');
				resolve(blob)
			});

		} catch (e) {
			reject(`Some problem with the PDF generation: ${e}`)
		}
	});  // end of the returned Promise
}

export default createPDF
