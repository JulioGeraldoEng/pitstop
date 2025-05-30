// Em js/global-scripts.js (ou no seu renderer.js principal)

document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    // Adicionei a Versão de volta, presumi que você também a quer na mesma linha.
    // Se não, pode remover o último <span>.
    const footerHTML = `
        <div id="app-footer-content">
            <p>
                <span>&copy; ${currentYear} Pitstop App. Todos os direitos reservados.</span>
                <span class="footer-info-item">Desenvolvido por: JG Soluções Tecnológicas.</span>
                <span class="footer-info-item"><i class="fas fa-phone"></i> (18) 99798-7391.</span>
                <span class="footer-info-item"><i class="fas fa-envelope"></i> juliogeraldo.eng@gmail.com</span>
            </p>
        </div>
    `;

    // O restante do código para criar e adicionar o footer permanece o mesmo...
    const footerElement = document.createElement('footer');
    footerElement.id = 'app-footer';
    footerElement.innerHTML = footerHTML;
    document.body.appendChild(footerElement);

    if (getComputedStyle(footerElement).position === 'fixed') {
        const footerHeight = footerElement.offsetHeight;
        // Adiciona um pouco mais de folga para garantir
        document.body.style.paddingBottom = `${footerHeight + 15}px`;
    }
});