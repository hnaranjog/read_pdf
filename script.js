document.addEventListener('DOMContentLoaded', function() {
    let pdfDoc = null;
    let currentPage = 1;
   
    const spinner = document.getElementById('spinner');
    const pdfContainer = document.getElementById('pdf-container');
    const fileInput = document.getElementById('file-input');

    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const fileInfoElement = document.getElementById('file-info');
    const fileNameElement = document.getElementById('file-name');
    const progressBar = document.getElementById('progress-bar');
    const progressBarInner = document.getElementById('progress-bar-inner'); // Inner progress bar

    const infoButton = document.getElementById('info-button');
    const infoPopup = document.getElementById('info-popup');
    const closeButton = document.querySelector('.close-button');
    const fileNameInfo = document.getElementById('file-name-info');
    const fileSizeInfo = document.getElementById('file-size-info');
    const fileDateInfo = document.getElementById('file-date-info');

    const sidenav = document.getElementById('sidenav');
    const toggleSidenavButton = document.getElementById('toggle-sidenav');
    const closeSidenavButton = document.getElementById('close-sidenav');  

    function renderCurrentPage() {
        if (pdfDoc) {
            pdfContainer.innerHTML = ''; // Clear previous page
            renderPage(currentPage).then(pageDiv => {
                pdfContainer.appendChild(pageDiv);
                updateProgressBar(currentPage, pdfDoc.numPages);
            });

            // Update the current page number in the UI
            currentPageElement.textContent = currentPage;
        }
    }

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
        
        // Show progress bar and reset it
        progressBar.style.display = 'block';
        progressBarInner.style.width = '0%';
        progressBarInner.textContent = '0%';

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

                // Initialize the slider
                $("#slider").slider({
                    range: "min",
                    min: 1,
                    max: pdf.numPages,
                    value: 0
                });

                // Hide spinner and show progress bar
                spinner.style.display = 'none';
                progressBar.style.display = 'block';

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
        if (!pdfDoc) {
            console.error('PDF document is not loaded.');
            return;
        }
    
        pdfContainer.innerHTML = ''; // Clear previous content
    
        const turnContainer = document.createElement('div');
        turnContainer.id = 'book';
        turnContainer.classList.add('turnjs');
        pdfContainer.appendChild(turnContainer);
    
        await renderPagesInPairs(turnContainer);
    
        // Initialize the turn.js library after all pages are rendered
        $(turnContainer).turn({
            width: pdfContainer.clientWidth,
            height: pdfContainer.clientHeight,
            autoCenter: true,
            display: 'double',
            elevation: 50,
            gradients: true,
            duration: 1000
        });
    
        spinner.style.display = 'none'; // Hide spinner after all pages are rendered
        pdfContainer.style.visibility = 'visible'; // Show PDF container
    }

    async function renderPagesInPairs(turnContainer) {
        if (!pdfDoc) {
            console.error('PDF document is not loaded.');
            return;
        }
    
        const totalPages = pdfDoc.numPages;
        let pagesRendered = 0;
    
        for (let i = 1; i <= totalPages; i += 2) {
            const leftPageNum = i;
            const rightPageNum = i + 1;
    
            const leftPageDiv = await renderPage(leftPageNum);
            if (leftPageDiv) {
                turnContainer.appendChild(leftPageDiv);
            }
            pagesRendered++;
    
            // Update progress bar after rendering left page
            updateProgressBar(pagesRendered, totalPages);
    
            // If there's a right-hand page, render it, otherwise add a blank page
            const rightPageDiv = rightPageNum <= totalPages ? await renderPage(rightPageNum) : createBlankPage();
            if (rightPageDiv) {
                turnContainer.appendChild(rightPageDiv);
            }
            pagesRendered++;
    
            // Update progress bar after rendering right page
            updateProgressBar(pagesRendered, totalPages);
        }
    }
    

    async function renderPage(pageNum) {
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
    
            // Render the page into the canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
    
            // Create a container div for the page
            const pageDiv = document.createElement('div');
            pageDiv.classList.add('page');
            pageDiv.appendChild(canvas);
    
            return pageDiv;
        } catch (error) {
            console.error('Error rendering page ' + pageNum + ': ' + error);
        }
    }

    function updateProgressBar(currentPage, totalPages) {
        let progressPercentage = (currentPage / totalPages) * 100;

        // Cap progress at 100% to avoid going over
        if (progressPercentage > 100) {
            progressPercentage = 100;
            spinner.style.display = 'none'; // hide spinner
        }
    
        progressBarInner.style.width = `${progressPercentage}%`;
        progressBarInner.textContent = `${Math.round(progressPercentage)}%`;
        
        spinner.style.display = 'block'; // Show spinner
    
        // Change the color of the progress bar based on the progress
        if (progressPercentage < 50) {
            progressBarInner.style.backgroundColor = '#f44336'; // Red
        } else if (progressPercentage < 75) {
            progressBarInner.style.backgroundColor = '#ffeb3b'; // Yellow
        } else {
            progressBarInner.style.backgroundColor = '#4caf50'; // Green
        }
    }

    function createBlankPage() {
        const pageDiv = document.createElement('div');
        pageDiv.classList.add('page');
        pageDiv.innerHTML = '<div class="blank-page"></div>';
        return pageDiv;
    }

    async function renderPage(pageNum) {
        try {
            if (pageNum > pdfDoc.numPages) {
                console.error(`Cannot render page ${pageNum}, maximum value is ${pdfDoc.numPages}`);
                return createBlankPage(); // Return a blank page if the page number is out of range
            }
    
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
    
            // Render the page into the canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
    
            // Create a container div for the page
            const pageDiv = document.createElement('div');
            pageDiv.classList.add('page');
            pageDiv.appendChild(canvas);
    
            return pageDiv; // Always return a pageDiv, even if blank
        } catch (error) {
            console.error('Error rendering page ' + pageNum + ': ' + error);
            return createBlankPage(); // Return a blank page in case of an error
        }
    }
        

    function renderPDF(view) {
        // Implement your logic to render the PDF based on the view
        console.log('Rendering PDF in ' + view + ' view.');
        const turnContainer = document.getElementById('book');
        if (!pdfDoc) {
            console.error('PDF document is not loaded.');
            return;
        }
        if (turnContainer) {
            turnContainer.innerHTML = ''; // Clear previous content
            renderPagesInPairs(turnContainer);
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