document.addEventListener('DOMContentLoaded', function() {
    let pdfDoc = null;
    let currentPage = 1;
    const pagesToRenderInitially = 5; // Number of pages to render initially
    const pagesToRenderOnNext = 5; // Number of pages to render on each next button click

    const spinner = document.getElementById('spinner');
    const pdfContainer = document.getElementById('pdf-container');
    const fileInput = document.getElementById('file-input');

    fileInput.addEventListener('change', function(event) {
        // Run cleanup before loading a new file
        cleanup();

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
        pdfContainer.style.visibility = 'hidden'; // Hide PDF container

        var fileReader = new FileReader();
        fileReader.onload = function() {
            var typedarray = new Uint8Array(this.result);

            // Set the workerSrc property to the CDN path
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                pdfDoc = pdf;
                renderInitialPages();
            }).catch(function(error) {
                console.error('Error loading PDF: ' + error);
                spinner.style.display = 'none'; // Hide spinner on error
            });
        };
        fileReader.readAsArrayBuffer(file);
    });

    document.getElementById('prev-page').addEventListener('click', function() {
        $('#book').turn('previous');
    });

    document.getElementById('next-page').addEventListener('click', async function() {
        const turnContainer = document.getElementById('book');
        const totalPages = pdfDoc.numPages;

        if (currentPage <= totalPages) {
            for (let i = 0; i < pagesToRenderOnNext; i++) {
                if (currentPage <= totalPages) {
                    await renderPage(currentPage, turnContainer);
                    currentPage++;
                }
            }

            // Update turn.js with the new pages
            $(turnContainer).turn('update');
        }

        $('#book').turn('next');
    });

    window.addEventListener('resize', function() {
        renderPDF();
    });

    async function renderInitialPages() {
        pdfContainer.innerHTML = ''; // Clear previous content

        const turnContainer = document.createElement('div');
        turnContainer.id = 'book';
        turnContainer.classList.add('turnjs');
        pdfContainer.appendChild(turnContainer);

        for (let i = 0; i < pagesToRenderInitially; i++) {
            if (currentPage <= pdfDoc.numPages) {
                await renderPage(currentPage, turnContainer);
                currentPage++;
            }
        }

        // Initialize the turn.js library after initial pages are rendered
        $(turnContainer).turn({
            width: pdfContainer.clientWidth,
            height: pdfContainer.clientHeight,
            autoCenter: true,
            display: 'double'
        });

        spinner.style.display = 'none'; // Hide spinner after initial pages are rendered
        pdfContainer.style.visibility = 'visible'; // Show PDF container
    }

    async function renderPage(pageNum, turnContainer) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        const pageDiv = document.createElement('div');
        pageDiv.classList.add('page');
        pageDiv.appendChild(canvas);
        turnContainer.appendChild(pageDiv);

        // Update turn.js with the new page
        $(turnContainer).turn('addPage', pageDiv, pageNum);
    }

    function cleanup() {
        // Clear the file input
        fileInput.value = '';

        // Release the PDF document
        if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
        }

        // Clear the PDF container
        pdfContainer.innerHTML = '';
    }

    // Add cleanup on window unload
    window.addEventListener('beforeunload', cleanup);
});