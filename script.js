document.addEventListener('DOMContentLoaded', function() {
    let currentScale = 1.5;
    let pdfDoc = null;

    const spinner = document.getElementById('spinner');

    document.getElementById('file-input').addEventListener('change', function(event) {
        var file = event.target.files[0];
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        // Mostrar el nombre del archivo seleccionado
        const fileNameElement = document.getElementById('file-name');
        if (fileNameElement) {
            fileNameElement.textContent = file.name;
        }

        spinner.style.display = 'block'; // Show spinner

        var fileReader = new FileReader();
        fileReader.onload = function() {
            var typedarray = new Uint8Array(this.result);

            // Set the workerSrc property to the CDN path
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                pdfDoc = pdf;
                renderPDF();
                spinner.style.display = 'none'; // Hide spinner
            }).catch(function(error) {
                console.error('Error loading PDF: ' + error);
                spinner.style.display = 'none'; // Hide spinner
            });
        };
        fileReader.readAsArrayBuffer(file);
    });

    document.getElementById('prev-page').addEventListener('click', function() {
        $('#book').turn('previous');
    });

    document.getElementById('next-page').addEventListener('click', function() {
        $('#book').turn('next');
    });

    window.addEventListener('resize', function() {
        renderPDF();
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
            // Determine the display mode based on window width
            const displayMode = window.innerWidth < 768 ? 'single' : 'double';

            // Initialize the turn.js library after all pages are rendered
            $(turnContainer).turn({
                width: pdfContainer.clientWidth,
                height: pdfContainer.clientHeight,
                autoCenter: true,
                display: displayMode
            });

            spinner.style.display = 'none'; // Hide spinner after all pages are rendered
        }).catch(function(error) {
            console.error('Error rendering PDF: ' + error);
            spinner.style.display = 'none'; // Hide spinner on error
        });
    }
});