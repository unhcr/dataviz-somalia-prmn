function loadPDF(pdfFile) {
    document.getElementById('pdf-viewer').src = pdfFile;
}

function toggleSubMenu(subMenuId) {
    var subMenu = document.getElementById(subMenuId);
    if (subMenu.style.display === "block") {
        subMenu.style.display = "none";
    } else {
        subMenu.style.display = "block";
    }
}
