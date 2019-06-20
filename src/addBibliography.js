const xpath = require('xpath')
import saveAs from 'file-saver'
const XMLSerializer = require('xmldom').XMLSerializer;

var oSerializer = new XMLSerializer();

async function addBibliography(pdfDoc, xmlDoc, bibliography, select) {
	let bibls = select("//tei:listBibl/tei:bibl", xmlDoc)

	bibls.forEach(bibl=>{
		let biblType = bibl.getAttribute('type');  // this gets the corpus, if it exists, e.g. IG  or SEG
		let citedRange = bibl.getElementsByTagName('citedRange')[0]

		let zoteroURI = select("string(tei:ptr/@target)", bibl)

		let zoteroId = zoteroURI?zoteroURI.split('/').pop():null; // get just the zotero id at the end of the zotero uri
		let citedRangeRef = citedRange?select("string(tei:ref/@target)", citedRange, true).trim():null
		let citedRangeText = citedRange?citedRange.textContent.trim():''
		let fullCitedRange = ' '
		if (citedRangeRef && citedRangeText) {
			fullCitedRange = ` At ${citedRangeText} (${citedRangeRef})`
		} else if (citedRangeText) {
			fullCitedRange = ` At ${citedRangeText}`
		} else if (citedRangeRef) {
			fullCitedRange = ` At ${citedRangeRef}`
		}

		if (bibliography.hasOwnProperty(zoteroId)) {
			const zoteroEntry = bibliography[zoteroId].data
			const itemType = zoteroEntry.itemType
			let authors = zoteroEntry.creators.filter(creator => creator.creatorType === 'author').map(author => `${author.lastName}, ${author.firstName}`).join(', ')
			authors = authors?authors.trim() + ' ':''
			const date = zoteroEntry.date?zoteroEntry.date.trim() + '. ':''
			const title = zoteroEntry.title?zoteroEntry.title.trim() + '. ':''
			let pubTitle = zoteroEntry.bookTitle || zoteroEntry.publicationTitle || zoteroEntry.series || zoteroEntry.seriesTitle ||  ''
			pubTitle = pubTitle?pubTitle.trim() + '. ':''

			const pages = zoteroEntry.pages?zoteroEntry.pages.trim() + '. ':''
			const placeOfPublication = zoteroEntry.place?zoteroEntry.place.trim() + '. ':''

			// then things specific to bib type, and construct citation
			if (itemType === 'journalArticle') {
				let volumeNumber = zoteroEntry.volume || zoteroEntry.issue
				volumeNumber = volumeNumber?volumeNumber.trim():''
				let volume = '';
				if (volumeNumber && pages) {
					volume = `${volumeNumber}: ${pages}`
				} else if (volumeNumber) {
					volume = volumeNumber + '. '
				} else if (pages) {
					volume = pages
				}
				pdfDoc.
					font('NotoSans').
					text(authors, {continued: true}).
					text(date, {continued: true}).
					text(title, {continued: true})

				if (pubTitle.trim()) {
					pdfDoc.font('NotoSansItalic').
					text(pubTitle, {continued: true}).
					font('NotoSans')
				}

				if (volume) {
					pdfDoc.text(volume, {continued: true})
				}

				pdfDoc.text(fullCitedRange, {continued: false})

			} else if (itemType === 'bookSection') {
				// output authors
				let editors = zoteroEntry.creators.filter(creator => creator.creatorType === 'editor').map(editor => `${editor.lastName}, ${editor.firstName}`).join(', ')
				if (editors) {
					editors = "In " + editors + "(eds.), "
					// output editors
				}
				pdfDoc.
				font('NotoSans').
				text(authors + ' ', {continued: true}).
				text(date, {continued: true}).
				text(title, {continued: true}).
				text(editors, {continued: true})
				if (pubTitle.trim()) {
					pdfDoc.font('NotoSansItalic').
					text(pubTitle, {continued: true}).
					font('NotoSans')
				}
				pdfDoc.text(placeOfPublication, {continued: true}).
				text(pages?'pp. '+pages:'', {continued: true}).
				text(fullCitedRange, {continued: false})

			} else 	if (itemType === 'book') {
				if (!authors) {
					//if there are no authors, then this is an edited book, and so output the editors instead.
					authors = zoteroEntry.creators.filter(creator => creator.creatorType === 'editor').map(editor => `${editor.lastName}, ${editor.firstName}`).join(', ')
					if (authors) {
						authors + "(eds.) "
					}
				}
				pdfDoc.
					font('NotoSans').
					text(authors,{continued: true}).
					text(date, {continued: true}).
					text(title, {continued: true})
				if (pubTitle.trim()) {
					pdfDoc.font('NotoSansItalic').
					text(pubTitle, {continued: true}).
					font('NotoSans')
				}
				pdfDoc.
					text(placeOfPublication, {continued: true}).
					text(fullCitedRange, {continued: false})

			}
		}

	})
}

export default addBibliography


//bibl.getElementsByTagName('ptr')[0].getAttribute('target').split('/').pop()
// citedRange.getElementsByTagName('ref').getAttribute('target')
