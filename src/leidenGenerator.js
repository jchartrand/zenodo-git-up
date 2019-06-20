import $ from 'jquery';

function printLeiden(xmlString, pdfDoc) {

//	console.log(xmlString)
try {
	var xmlDoc = $($.parseXML(xmlString));

	const extraSquareBracketRegex = new RegExp('\\] \\[', 'g')

	// this shows multiple editions:  http://sicily.classics.ox.ac.uk/inscription/ISic0119

	let editions = xmlDoc.find("div[type='edition']")

	editions.each(function (index, node) {
		let teiDomFragment = $(node)

		// if there is a name for the edition, print it
		if (teiDomFragment.attr('n')) {

			pdfDoc.font('NotoSansBold').text(`Edition: ${teiDomFragment.attr('n')}`).font('NotoSans')
		}

		/*I think the problem here might be that I am passing in elements that came from the xpath processor.  I might want to do this with
		the original document directly.  pass in the parseddoc directly to the printleiden method then getr the edtions with jquery and then do trhe find.
*/
		teiDomFragment.find('supplied').before('[').after(']');
		//  before($('<span class='leiden_supplied_start'>').
		//  text('[')).after($('<span class='leiden_supplied_end'>').
		//  text(']'));

		// put a dot under each character within the unclear element
		teiDomFragment.find('unclear').each(
			function () {
				var unclearElement = $(this);
				unclearElement.text(
					unclearElement.text().split('').map(function (character) {
						return character + '\u0323'
					}).join().trim()
				);
			});

		teiDomFragment.find('hi').each(
			function () {
				var hiElement = $(this);
				var rend = hiElement.attr('rend');
				if (rend == 'ligature') {
					var oldText = hiElement.text();
					hiElement.text(oldText.charAt(0) + '\u0302' + oldText.substring(1));
				}
			}
		)

		teiDomFragment.find('ex').before('(').after(')');

		teiDomFragment.find('gap').each(
			function () {
				var elementText;
				var gapElement = $(this);
				var reason = gapElement.attr('reason');
				var extent = gapElement.attr('extent');
				var unit = gapElement.attr('unit');
				if (reason == 'lost') {
					elementText = '[';
					if (extent == 'unknown') {
						elementText += '---';
					} else {
						elementText += '.'.repeat(extent);
					}
					elementText += ']';
				} else if (reason == 'illegible') {
					elementText = '+'.repeat(extent);
				}
				gapElement.text(elementText);
			}
		)

		teiDomFragment.find('g[ref="interpunct"]').text('·');

		teiDomFragment.find('space').each(
			function () {
				var spaceElement = $(this);
				var extent = spaceElement.attr('extent');
				spaceElement.text('(vac.' + extent + ')');
			})


		var leidenString = ''
		// we loop over the contents of the transcription, printing as we go,
		// and looking for line breaks - if we find an lb we go to the
		// next line and print the line number on the new line.
		teiDomFragment.children('ab').first().contents().each(function (index, aNode) {
			let nodeType = aNode.nodeType
			let $node = $(aNode);

			if (nodeType === 1) {
				// node type is element
				if ($node.is('lb')) {
					// print the prior line and start next
					// but also elide adjoining 'lost' square brackets, e.g.
					//  change [---][τὸ κοι]νὸν  to   [---τὸ κοι]νὸν
					if (leidenString.trim()) pdfDoc.text(leidenString.replace(extraSquareBracketRegex, ''));
					leidenString = `${$node.attr('n')}. `
				} else {
					// all other elements, print the text, including descendants text
					leidenString = leidenString.concat($node.text().replace(/\s+/g, " "))

				}
			} else if (nodeType === 3) {
				// node type is text, so print it
				leidenString = leidenString.concat($node.text().replace(/\s+/g, " "))

			}

		});
		// print last line of Leiden if it exists
		if (leidenString.trim()) pdfDoc.text(leidenString.replace(extraSquareBracketRegex, ' '))


	})

} catch (e) {
	console.log(`error in LeidenGenerator: ${e}`)
	throw new Error(`error in LeidenGenerator: ${e}`)
}
}

export default printLeiden

/*
else if ($this.is('space')) {
					var extent = $this.attr('extent');
					continueLine('(vac.' + extent + ')');
				} else if ($this.is('g[ref="interpunct"]')) {
					continueLine('.')
				} else if ($this.is('gap') ) {
					var reason = $this.attr('reason');
					var extent = $this.attr('extent');
					var unit = $this.attr('unit');
					if (reason == 'lost') {
						continueLine('[');
						if (extent == 'unknown') {
							continueLine('---');
						} else {
							continueLine('.'.repeat(extent));
						}
						continueLine(']');
					} else if (reason == 'illegible') {
						continueLine('+'.repeat(extent));
					}
					continueLine(elementText);
				} else if ($this.is('ex')) {
					continueLine(``)
				}
 */
