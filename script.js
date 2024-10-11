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

            // Set the workerSrc property to the CDN path
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

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

    document.getElementById('prev-page').addEventListener('click', function() {
        $('#book').turn('previous');
    });

    document.getElementById('next-page').addEventListener('click', function() {
        $('#book').turn('next');
    });

    function renderPDF() {
        if (!pdfDoc) return;

        const pdfContainer = document.getElementById('pdf-container');
        pdfContainer.innerHTML = ''; // Clear previous content

        const turnContainer = document.createElement('div');
        turnContainer.id = 'book';
        turnContainer.classList.add('turnjs');
        pdfContainer.appendChild(turnContainer);

        const promises = [];
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            promises.push(pdfDoc.getPage(pageNum).then(function(page) {
                const viewport = page.getViewport({ scale: currentScale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                return page.render(renderContext).promise.then(function() {
                    const pageDiv = document.createElement('div');
                    pageDiv.classList.add('page');
                    pageDiv.appendChild(canvas);
                    turnContainer.appendChild(pageDiv);
                });
            }));
        }

        Promise.all(promises).then(function() {
            // Initialize the turn.js library after all pages are rendered
            $(turnContainer).turn({
                width: pdfContainer.clientWidth,
                height: pdfContainer.clientHeight,
                autoCenter: true,
                display: 'double'
            });
        });
    }
});