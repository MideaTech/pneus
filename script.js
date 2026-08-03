let estoqueCompleto = [];
let modoInternoAtivo = false;

// Formata valor numérico para moeda BRL
function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Extrai Largura, Perfil e Aro da string de medida (ex: "205/55 R16")
function parseMedida(medidaStr) {
  const match = medidaStr.match(/(\d+)\/(\d+)\s*R(\d+(\.\d+)?)/i);
  if (match) {
    return {
      largura: match[1],
      perfil: match[2],
      aro: match[3]
    };
  }
  return { largura: null, perfil: null, aro: null };
}

// Preenche os filtros dinamicamente com base nos dados do JSON
function popularFiltros(pneus) {
  const marcas = new Set();
  const larguras = new Set();
  const perfis = new Set();
  const aros = new Set();

  pneus.forEach(pneu => {
    if (pneu.marca) marcas.add(pneu.marca.trim());

    const { largura, perfil, aro } = parseMedida(pneu.medida);
    if (largura) larguras.add(largura);
    if (perfil) perfis.add(perfil);
    if (aro) aros.add(aro);
  });

  preencherSelect('select-marca', Array.from(marcas).sort());
  preencherSelect('select-largura', Array.from(larguras).sort((a, b) => a - b));
  preencherSelect('select-perfil', Array.from(perfis).sort((a, b) => a - b));
  preencherSelect('select-aro', Array.from(aros).sort((a, b) => a - b));
}

function preencherSelect(elementId, opcoes) {
  const select = document.getElementById(elementId);
  opcoes.forEach(opcao => {
    const opt = document.createElement('option');
    opt.value = opcao;
    opt.textContent = opcao;
    select.appendChild(opt);
  });
}

// Renderiza a lista de pneus no HTML
function renderizarEstoque(pneus) {
  const container = document.getElementById('grid-pneus');
  container.innerHTML = '';

  if (pneus.length === 0) {
    container.innerHTML = '<div class="status-msg">Nenhum pneu encontrado com os filtros selecionados.</div>';
    return;
  }

  pneus.forEach(pneu => {
    const card = document.createElement('div');
    card.className = 'card';

    // Cálculos para o Modo Interno (Custo = 77% do valor de venda | Lucro = 23% restante)
    const precoCusto = pneu.preco * 0.77;
    const precoLucro = pneu.preco - precoCusto;

    // Renderiza apenas se o modo interno estiver ativo
    const elementoValoresInternos = modoInternoAtivo 
      ? `
        <span class="stock-value">Estoque: ${pneu.estoque ?? 0} un.</span>
        <span class="cost-value">Custo: ${formatarPreco(precoCusto)}</span>
        <span class="profit-value">Lucro: ${formatarPreco(precoLucro)}</span>
      ` 
      : '';

    card.innerHTML = `
      <div class="card-img-wrapper">
        <span class="badge-marca">${pneu.marca}</span>
        <img class="card-img" 
             src="${pneu.imagem}" 
             alt="Pneu ${pneu.marca} ${pneu.modelo}" 
             loading="lazy"
             onerror="this.onerror=null; this.src='imagens/generic.jpg';">
      </div>
      <div class="card-body">
        <h2 class="card-modelo">${pneu.modelo}</h2>
        <div>
          <span class="card-medida">${pneu.medida} ${pneu.indice || ''}</span>
        </div>
        <div class="card-footer">
          <div class="price-container">
            <span class="price-label">À vista</span>
            <span class="price-value">${formatarPreco(pneu.preco)}</span>
            ${elementoValoresInternos}
          </div>
          <button class="btn-detalhes"
              onclick="comprarWhatsapp('${pneu.marca}', '${pneu.modelo}', '${pneu.medida}')">
              Comprar
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Aplica todos os filtros selecionados em conjunto
function aplicarFiltros() {
  const marcaSel = document.getElementById('select-marca').value;
  const larguraSel = document.getElementById('select-largura').value;
  const perfilSel = document.getElementById('select-perfil').value;
  const aroSel = document.getElementById('select-aro').value;

  const pneusFiltrados = estoqueCompleto.filter(pneu => {
    const { largura, perfil, aro } = parseMedida(pneu.medida);

    const bateuMarca = !marcaSel || pneu.marca.trim() === marcaSel;
    const bateuLargura = !larguraSel || largura === larguraSel;
    const bateuPerfil = !perfilSel || perfil === perfilSel;
    const bateuAro = !aroSel || aro === aroSel;

    return bateuMarca && bateuLargura && bateuPerfil && bateuAro;
  });

  renderizarEstoque(pneusFiltrados);
}

// Reseta todos os filtros
function limparFiltros() {
  document.getElementById('select-marca').value = '';
  document.getElementById('select-largura').value = '';
  document.getElementById('select-perfil').value = '';
  document.getElementById('select-aro').value = '';
  renderizarEstoque(estoqueCompleto);
}

// Alterna o estado do modo interno
function alternarModoInterno(ativo) {
  modoInternoAtivo = ativo;

  const btnCadeado = document.getElementById('btn-cadeado');
  const badgeModoInterno = document.getElementById('badge-modo-interno');

  if (modoInternoAtivo) {
    btnCadeado.textContent = '🔓';
    btnCadeado.title = 'Sair do Modo Interno';
    badgeModoInterno.classList.remove('hidden');
  } else {
    btnCadeado.textContent = '🔒';
    btnCadeado.title = 'Acesso Interno';
    badgeModoInterno.classList.add('hidden');
  }

  aplicarFiltros();
}

// Alternar visualização da senha
function toggleMostrarSenha() {
  const inputSenha = document.getElementById('input-senha');
  const btnToggle = document.getElementById('btn-toggle-senha');
  const iconEyeOpen = document.getElementById('icon-eye-open');
  const iconEyeClosed = document.getElementById('icon-eye-closed');

  if (inputSenha.type === 'password') {
    inputSenha.type = 'text';
    if (iconEyeOpen) iconEyeOpen.classList.add('hidden');
    if (iconEyeClosed) iconEyeClosed.classList.remove('hidden');
    if (btnToggle) btnToggle.title = 'Ocultar senha';
  } else {
    inputSenha.type = 'password';
    if (iconEyeOpen) iconEyeOpen.classList.remove('hidden');
    if (iconEyeClosed) iconEyeClosed.classList.add('hidden');
    if (btnToggle) btnToggle.title = 'Mostrar senha';
  }
}

// Gerenciamento do Modal de Senha
function abrirModal() {
  const modal = document.getElementById('modal-senha');
  const inputSenha = document.getElementById('input-senha');
  const msgErro = document.getElementById('msg-erro-senha');

  inputSenha.value = '';
  msgErro.classList.add('hidden');
  modal.classList.remove('hidden');
  inputSenha.focus();
}

function fecharModal() {
  const inputSenha = document.getElementById('input-senha');
  const iconEyeOpen = document.getElementById('icon-eye-open');
  const iconEyeClosed = document.getElementById('icon-eye-closed');
  const btnToggle = document.getElementById('btn-toggle-senha');

  // Reseta para o estado inicial oculta ao fechar o modal
  inputSenha.type = 'password';
  if (iconEyeOpen && iconEyeClosed) {
    iconEyeOpen.classList.remove('hidden');
    iconEyeClosed.classList.add('hidden');
  }
  if (btnToggle) {
    btnToggle.title = 'Mostrar senha';
  }

  document.getElementById('modal-senha').classList.add('hidden');
}

async function verificarSenha(event) {
  event.preventDefault();
  const senhaDigitada = document.getElementById('input-senha').value;
  const msgErro = document.getElementById('msg-erro-senha');

  try {
    const resposta = await fetch('senha.json');
    if (!resposta.ok) throw new Error('Não foi possível verificar a senha.');

    const dados = await resposta.json();

    if (dados.senha && senhaDigitada === dados.senha) {
      fecharModal();
      alternarModoInterno(true);
    } else {
      msgErro.classList.remove('hidden');
    }
  } catch (erro) {
    console.error('Erro ao verificar senha:', erro);
    alert('Erro ao carregar o arquivo de verificação de senha.');
  }
}

// Carrega o JSON de Estoque
async function carregarEstoque() {
  const container = document.getElementById('grid-pneus');

  try {
    const resposta = await fetch('dados.json');
    
    if (!resposta.ok) {
      throw new Error('Não foi possível carregar o arquivo JSON.');
    }

    estoqueCompleto = await resposta.json();
    
    popularFiltros(estoqueCompleto);
    renderizarEstoque(estoqueCompleto);

    // Event Listeners nos Filtros
    document.getElementById('select-marca').addEventListener('change', aplicarFiltros);
    document.getElementById('select-largura').addEventListener('change', aplicarFiltros);
    document.getElementById('select-perfil').addEventListener('change', aplicarFiltros);
    document.getElementById('select-aro').addEventListener('change', aplicarFiltros);
    document.getElementById('btn-reset').addEventListener('click', limparFiltros);

  } catch (erro) {
    console.error('Erro ao buscar dados:', erro);
    container.innerHTML = `
      <div class="status-msg">
        <p>Ocorreu um erro ao carregar o estoque.</p>
        <small style="color: #ef4444;">Certifique-se de estar rodando a página em um servidor local (ex: Live Server).</small>
      </div>
    `;
  }
}

function comprarWhatsapp(marca, modelo, medida) {
  const numero = '5547999924952';

  const mensagem =
`Olá! Tenho interesse no seguinte pneu:

Marca: ${marca}
Modelo: ${modelo}
Medida: ${medida}`;

  window.open(
    `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`,
    '_blank'
  );
}

// Inicialização e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  carregarEstoque();

  const btnCadeado = document.getElementById('btn-cadeado');
  const btnFecharModal = document.getElementById('btn-fechar-modal');
  const formSenha = document.getElementById('form-senha');
  const btnTopo = document.getElementById('btn-topo');
  const btnToggleSenha = document.getElementById('btn-toggle-senha');

  // Alternar Modo Interno / Modal
  btnCadeado.addEventListener('click', () => {
    if (modoInternoAtivo) {
      alternarModoInterno(false);
    } else {
      abrirModal();
    }
  });

  btnFecharModal.addEventListener('click', fecharModal);
  formSenha.addEventListener('submit', verificarSenha);

  if (btnToggleSenha) {
    btnToggleSenha.addEventListener('click', toggleMostrarSenha);
  }

  // Exibir/Ocultar botão Voltar ao Topo durante a rolagem
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btnTopo.classList.remove('hidden');
    } else {
      btnTopo.classList.add('hidden');
    }
  });

  // Ação de rolagem até o topo
  btnTopo.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});