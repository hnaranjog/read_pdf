document.addEventListener('DOMContentLoaded', function() {
    let currentScale = 1.5;
    let pdfDoc = null;

    document.getElementById('file-input').addEventListener('change', function(event) {
        var file = event.target.files[0];
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        var fileReader = new FileReader();
        fileReader.onload = function() {
            var typedarray = new Uint8Array(this.result);

            // Set the workerSrc property
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';

            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                pdfDoc = pdf;
                renderPDF();
            }).catch(function(error) {
                console.error('Error loading PDF: ' + error);
            });
        };
        fileReader.readAsArrayBuffer(file);
    });

    document.getElementById('zoom-in').addEventListener('click', function() {
        currentScale += 0.1;
        renderPDF();
    });

    document.getElementById('zoom-out').addEventListener('click', function() {
        if (currentScale > 0.5) {
            currentScale -= 0.1;
            renderPDF();
        }
    });

    function renderPDF() {
        if (!pdfDoc) {
            return;
        }

        const book = document.getElementById('book');
        book.innerHTML = '';

        let pagesRendered = 0;

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            pdfDoc.getPage(pageNum).then(function(page) {
                const viewport = page.getViewport({ scale: currentScale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise.then(function() {
                    const pageDiv = document.createElement('div');
                    pageDiv.className = 'page';
                    pageDiv.appendChild(canvas);
                    book.appendChild(pageDiv);

                    pagesRendered++;
                    if (pagesRendered === pdfDoc.numPages) {
                        initializeTurnJS();
                    }
                });
            });
        }
    }

    function initializeTurnJS() {
        $('#book').turn({
            width: document.getElementById('pdf-container').clientWidth,
            height: document.getElementById('pdf-container').clientHeight,
            autoCenter: true
        });
    }
});