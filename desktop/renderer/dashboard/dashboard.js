function irPara(pagina) {
    window.location.href = pagina;
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../login/login.html';
}

if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = '../login/login.html';
}