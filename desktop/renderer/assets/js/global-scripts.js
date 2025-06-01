// Executa após carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();

    // Montagem do footer com informações e copyright
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

    // Criação e inserção do footer no body
    const footerElement = document.createElement('footer');
    footerElement.id = 'app-footer';
    footerElement.innerHTML = footerHTML;
    document.body.appendChild(footerElement);

    // Ajusta padding-bottom do body caso o footer seja fixo
    if (getComputedStyle(footerElement).position === 'fixed') {
        const footerHeight = footerElement.offsetHeight;
        document.body.style.paddingBottom = `${footerHeight + 15}px`;
    }

    // Recupera a cor salva no localStorage com a chave correta
    const corSalva = localStorage.getItem('corBody');
    if (corSalva) {
        // Aplica a cor salva no body e sidebar
        mudarCorBody(corSalva);
    }
});

function aplicarCorSidebarComBaseNoBody() {
    const corBody = getComputedStyle(document.body).backgroundColor;
    const corEscura = escurecerRGB(corBody, 20); // escurece 20%

    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.backgroundColor = corEscura;
    }
}

function clarearRGB(rgb, porcentagem) {
    const valores = rgb.match(/\d+/g).map(Number);
    const r = Math.min(255, Math.floor(valores[0] + (255 - valores[0]) * (porcentagem / 100)));
    const g = Math.min(255, Math.floor(valores[1] + (255 - valores[1]) * (porcentagem / 100)));
    const b = Math.min(255, Math.floor(valores[2] + (255 - valores[2]) * (porcentagem / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

function escurecerRGB(rgb, porcentagem) {
    const valores = rgb.match(/\d+/g).map(Number);
    const r = Math.max(0, Math.floor(valores[0] * (1 - porcentagem / 100)));
    const g = Math.max(0, Math.floor(valores[1] * (1 - porcentagem / 100)));
    const b = Math.max(0, Math.floor(valores[2] * (1 - porcentagem / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

function mudarCorBody(cor) {
    document.body.style.backgroundColor = cor;
    // Salva a cor no localStorage com a chave correta
    localStorage.setItem('corBody', cor);

    // Atualiza sidebar com cor escurecida
    aplicarCorSidebarComBaseNoBody();
}

// Se quiser escutar evento vindo do Electron para mudar cor dinamicamente
window.electronAPI?.onChangeBodyColor?.((event, corHex) => {
    mudarCorBody(corHex);
});
