## I.Sicily Zenodo uploader

Reads epidoc files from a Github repository, builds a PDF from each, then uploads both to Zenodo.  Also updates each XML file with the new DOI.

Runs directly from this Github repository, using Github pages, which publishes the repository as a web site.

To use, open:

insert url here once Github Pages is turned on.

Then fill out the form with your Github token, your Zenodo token, the name of
the repository that has the TEI files, the directory in that repository, and upload.

To create the bibliography for the PDF, the bibliography records in Zotero are all first read into a cached file - cachedBibl.json
