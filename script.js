document.addEventListener('DOMContentLoaded', function() {
    let pdfDoc = null;
    let currentPage = 1;
    const pagesToRenderInitially = 5; // Number of pages to render initially
    const pagesToRenderOnNext = 2; // Number of pages to render on each next button click

    const spinner = document.getElementById('spinner');
    const pdfContainer = document.getElementById('pdf-container');
    const fileInput = document.getElementById('file-input');
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const fileInfoElement = document.getElementById('file-info');
    const fileNameElement = document.getElementById('file-name');

    const infoButton = document.getElementById('info-button');
    const infoPopup = document.getElementById('info-popup');
    const closeButton = document.querySelector('.close-button');
    const fileNameInfo = document.getElementById('file-name-info');
    const fileSizeInfo = document.getElementById('file-size-info');
    const fileDateInfo = document.getElementById('file-date-info');

    fileInput.addEventListener('change', function(event) {
        var file = event.target.files[0];
        if (!file) {
            alert('No file selected.');
            return;
        }

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        // Mostrar el nombre del archivo seleccionado
        if (fileNameElement) {
            fileNameElement.textContent = file.name;
        }

        // Mostrar la información del archivo en el popup
        fileNameInfo.textContent = 'Name: ' + file.name;
        fileSizeInfo.textContent = 'Size: ' + (file.size / 1024).toFixed(2) + ' KB';
        fileDateInfo.textContent = 'Last Modified: ' + new Date(file.lastModified).toLocaleDateString();

        // Mostrar el botón de información
        infoButton.style.display = 'block';

        spinner.style.display = 'block'; // Show spinner
        pdfContainer.style.visibility = 'hidden'; // Hide PDF container

        var fileReader = new FileReader();
        fileReader.onload = function() {
            var typedarray = new Uint8Array(this.result);

            // Set the workerSrc property to the CDN path
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                pdfDoc = pdf;
                if (totalPagesElement) {
                    totalPagesElement.textContent = pdf.numPages;
                }
                currentPage = 1; // Reset currentPage to 1
                renderInitialPages();
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
                alert('Error loading PDF: ' + error.message);
                spinner.style.display = 'none'; // Hide spinner on error
            });
        };
        fileReader.readAsArrayBuffer(file);
    });

    infoButton.addEventListener('click', function() {
        infoPopup.style.display = 'block';
    });

    closeButton.addEventListener('click', function() {
        infoPopup.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target == infoPopup) {
            infoPopup.style.display = 'none';
        }
    });

    document.getElementById('prev-page').addEventListener('click', function() {
        $('#book').turn('previous');
        if (currentPage > 1) {
            currentPage -= 2;
            updatePaginator();
        }
    });

    document.getElementById('next-page').addEventListener('click', async function() {
        const turnContainer = document.getElementById('book');
        const totalPages = pdfDoc.numPages;

        if (currentPage + 2 <= totalPages) {
            await renderPages(currentPage + 1, pagesToRenderOnNext, turnContainer);
            currentPage += 2;
            updatePaginator();
        }

        $('#book').turn('next');
    });

    window.addEventListener('resize', function() {
        renderPDF('current');
    });

    async function renderInitialPages() {
        pdfContainer.innerHTML = ''; // Clear previous content

        const turnContainer = document.createElement('div');
        turnContainer.id = 'book';
        turnContainer.classList.add('turnjs');
        pdfContainer.appendChild(turnContainer);

        await renderPages(currentPage, pagesToRenderInitially, turnContainer);

        // Initialize the turn.js library after initial pages are rendered
        $(turnContainer).turn({
            width: pdfContainer.clientWidth,
            height: pdfContainer.clientHeight,
            autoCenter: true,
            display: 'double'
        });

        spinner.style.display = 'none'; // Hide spinner after initial pages are rendered
        pdfContainer.style.visibility = 'visible'; // Show PDF container

        updatePaginator(); // Update paginator after initial pages are rendered
    }

    async function renderPages(startPage, numPages, turnContainer) {
        if (!pdfDoc) {
            console.error('PDF document is not loaded.');
            return;
        }

        const promises = [];
        for (let i = 0; i < numPages; i++) {
            if (startPage + i <= pdfDoc.numPages) {
                promises.push(renderPage(startPage + i, turnContainer));
            }
        }
        await Promise.all(promises);
    }

    async function renderPage(pageNum, turnContainer) {
        try {
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
        } catch (error) {
            console.error('Error rendering page ' + pageNum + ': ' + error);
        }
    }

    // Dummy function to check if the file is an upload file
    function isUploadFile() {
        // Implement your logic to determine if the file is an upload file
        return false; // Change this to your actual condition
    }

    function updatePaginator() {
        if (currentPageElement) {
            currentPageElement.textContent = currentPage;
        }
    }

    function renderPDF(view) {
        // Implement your logic to render the PDF based on the view
        console.log('Rendering PDF in ' + view + ' view.');
        const turnContainer = document.getElementById('book');
        if (turnContainer) {
            turnContainer.innerHTML = ''; // Clear previous content
            renderPages(currentPage, pagesToRenderOnNext, turnContainer);
        }
    }

    function cleanup() {
        // Clear the file input
        fileInput.value = '';

        // Release the PDF document
        if (pdfDoc) {
            pdfDoc.cleanup();
            pdfDoc = null;
        }

        // Clear the PDF container
        pdfContainer.innerHTML = '';
    }

    // Add cleanup on window unload
    window.addEventListener('beforeunload', cleanup);

    // Add event listener for viewport changes
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    mediaQuery.addEventListener('change', handleViewportChange);
    handleViewportChange(mediaQuery);

    function handleViewportChange(e) {
        if (e.matches) {
            // Viewport is less than 768px
            renderPDF('single');
        } else {
            // Viewport is 768px or greater
            renderPDF('double');
        }
    }
});