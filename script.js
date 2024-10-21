document.addEventListener('DOMContentLoaded', function() {
    // Initialize the slider
    $("#slider").slider({
        range: true,
        min: 0,
        max: 100,
        values: [20, 80],
        slide: function(event, ui) {
            $("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
        }
    });
    $("#amount").val("$" + $("#slider").slider("values", 0) +
        " - $" + $("#slider").slider("values", 1));
        
    let pdfDoc = null;
    let currentPage = 1;
   
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

    const sidenav = document.getElementById('sidenav');
    const toggleSidenavButton = document.getElementById('toggle-sidenav');
    const closeSidenavButton = document.getElementById('close-sidenav');

    toggleSidenavButton.addEventListener('click', function() {
        if (sidenav.style.width === '250px') {
            sidenav.style.width = '0';
        } else {
            sidenav.style.width = '250px';
        }
    });

    closeSidenavButton.addEventListener('click', function() {
        sidenav.style.width = '0';
    });

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
            pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdfjs/pdf.worker.min.js';

            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                pdfDoc = pdf;
                if (totalPagesElement) {
                    totalPagesElement.textContent = pdf.numPages;
                }
                currentPage = 1; // Reset currentPage to 1
                renderAllPages();
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

    window.addEventListener('resize', function() {
        renderPDF('current');
    });

    async function renderAllPages() {
        pdfContainer.innerHTML = ''; // Clear previous content

        const turnContainer = document.createElement('div');
        turnContainer.id = 'book';
        turnContainer.classList.add('turnjs');
        pdfContainer.appendChild(turnContainer);

        await renderPages(1, pdfDoc.numPages, turnContainer);

        // Initialize the turn.js library after all pages are rendered
        $(turnContainer).turn({
            width: pdfContainer.clientWidth,
            height: pdfContainer.clientHeight,
            autoCenter: true,
            display: 'double'
        });

        spinner.style.display = 'none'; // Hide spinner after all pages are rendered
        pdfContainer.style.visibility = 'visible'; // Show PDF container
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
            if (pageNum > pdfDoc.numPages) {
                console.error(`Cannot render page ${pageNum}, maximum value is ${pdfDoc.numPages}`);
                return;
            }
            
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Adjust canvas size to fit the container
            const containerWidth = pdfContainer.clientWidth;
            const containerHeight = pdfContainer.clientHeight;
            const scale = Math.min(containerWidth / viewport.width, containerHeight / viewport.height);
            canvas.style.width = `${viewport.width * scale}px`;
            canvas.style.height = `${viewport.height * scale}px`;

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