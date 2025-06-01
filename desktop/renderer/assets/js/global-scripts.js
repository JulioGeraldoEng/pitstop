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

    const corSalva = localStorage.getItem('corApp');
    if (corSalva) {
        document.body.style.backgroundColor = corSalva;
        aplicarCorSidebarComBaseNoBody();
    }
});

function aplicarCorSidebarComBaseNoBody() {
  const corBody = getComputedStyle(document.body).backgroundColor;
  //const corClara = clarearRGB(corBody, 30);
  const corEscura = escurecerRGB(corBody, 20); // escurece 20%

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    //sidebar.style.backgroundColor = corClara;
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


window.electronAPI?.onChangeBodyColor?.((event, corHex) => {
  document.body.style.backgroundColor = corHex;
  aplicarCorSidebarComBaseNoBody();
});
