document.addEventListener('DOMContentLoaded', function() {
    const toggles = document.querySelectorAll('.feature-toggle');

    toggles.forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            // Encontra o elemento de detalhes associado
            const targetId = this.getAttribute('data-target');
            const detailsElement = document.getElementById(targetId);

            if (detailsElement) {
                // Alterna a classe 'open' no toggle
                this.classList.toggle('open');
                // Alterna a exibição do elemento de detalhes
                if (detailsElement.style.display === 'block') {
                    detailsElement.style.display = 'none';
                } else {
                    detailsElement.style.display = 'block';
                }
            }

            // Opcional: Fechar outros itens abertos (comportamento de accordion)
            /*
            if (detailsElement && detailsElement.style.display === 'block') {
                toggles.forEach(function(otherToggle) {
                    if (otherToggle !== toggle) {
                        const otherTargetId = otherToggle.getAttribute('data-target');
                        const otherDetailsElement = document.getElementById(otherTargetId);
                        if (otherDetailsElement) {
                            otherDetailsElement.style.display = 'none';
                            otherToggle.classList.remove('open');
                        }
                    }
                });
            }
            */
        });
    });
});