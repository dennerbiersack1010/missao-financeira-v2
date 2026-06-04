import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFTV0O2H97bdc_R7izGs9cHxZa4EN31_A",
  authDomain: "missao-financeira.firebaseapp.com",
  projectId: "missao-financeira",
  storageBucket: "missao-financeira.firebasestorage.app",
  messagingSenderId: "326634668920",
  appId: "1:326634668920:web:409e8cd90dea68a27f7e8d",
  measurementId: "G-16EG9EJ4RQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const documentoRef = doc(db, "dadosFinanceirosV2", "dener");

let entradas = [];
let saidas = [];
let contas = [];
let metas = [];

function pegar(id) {
  return document.getElementById(id);
}

function escrever(id, texto) {
  const elemento = pegar(id);
  if (elemento) elemento.textContent = texto;
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function converterValorDigitado(valor) {
  if (valor === null || valor === undefined) return NaN;

  return Number(
    valor
      .toString()
      .trim()
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function hojeSemHora() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function calcularDias(vencimento) {
  if (!vencimento) return null;

  const hoje = hojeSemHora();
  const data = new Date(vencimento + "T00:00:00");
  const diff = data - hoje;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function textoDias(vencimento, paga = false) {
  if (paga) return "Conta paga";

  const dias = calcularDias(vencimento);

  if (dias === null) return "Sem vencimento";
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";

  return `Vence em ${dias} dias`;
}

/* ÍCONE PNG POR CATEGORIA */

function iconeConta(nome, categoria) {
  const texto = `${nome} ${categoria}`.toLowerCase();

  let arquivo = "icone-outros.png";

  if (
    texto.includes("spotify") ||
    texto.includes("netflix") ||
    texto.includes("youtube") ||
    texto.includes("streaming") ||
    texto.includes("prime") ||
    texto.includes("disney") ||
    texto.includes("max") ||
    texto.includes("hbo") ||
    texto.includes("globoplay")
  ) {
    arquivo = "icone-streaming.png";
  } else if (
    texto.includes("internet") ||
    texto.includes("wifi") ||
    texto.includes("wi-fi") ||
    texto.includes("claro") ||
    texto.includes("vivo") ||
    texto.includes("tim")
  ) {
    arquivo = "icone-wifi.png";
  } else if (
    texto.includes("app") ||
    texto.includes("apps") ||
    texto.includes("chatgpt") ||
    texto.includes("openai") ||
    texto.includes("canva") ||
    texto.includes("software")
  ) {
    arquivo = "icone-apps.png";
  } else if (
    texto.includes("pessoa") ||
    texto.includes("fulano") ||
    texto.includes("empréstimo") ||
    texto.includes("emprestimo") ||
    texto.includes("amigo") ||
    texto.includes("familiar")
  ) {
    arquivo = "icone-pessoa.png";
  } else if (
    texto.includes("serviço") ||
    texto.includes("servico") ||
    texto.includes("manutenção") ||
    texto.includes("manutencao") ||
    texto.includes("freela") ||
    texto.includes("profissional")
  ) {
    arquivo = "icone-servicos.png";
  } else if (
    texto.includes("moradia") ||
    texto.includes("aluguel") ||
    texto.includes("casa") ||
    texto.includes("apartamento") ||
    texto.includes("condomínio") ||
    texto.includes("condominio")
  ) {
    arquivo = "icone-moradia.png";
  }

  return `<img src="assets/${arquivo}" alt="${categoria}" class="account-icon-img">`;
}

/* FIREBASE */

async function carregarDados() {
  try {
    const snapshot = await getDoc(documentoRef);

    if (snapshot.exists()) {
      const dados = snapshot.data();

      entradas = dados.entradas || [];
      saidas = dados.saidas || [];
      contas = dados.contas || [];
      metas = dados.metas || [];
    } else {
      await salvarDados();
    }

    atualizarTela();
  } catch (erro) {
    console.error("Erro ao carregar Firebase:", erro);
    alert("Erro ao carregar dados da V2.");
  }
}

async function salvarDados() {
  try {
    await setDoc(documentoRef, {
      entradas,
      saidas,
      contas,
      metas,
      atualizadoEm: new Date().toISOString()
    });
  } catch (erro) {
    console.error("Erro ao salvar Firebase:", erro);
    alert("Erro ao salvar dados da V2.");
  }
}

/* CÁLCULOS */

function calcularResumo() {
  const totalEntradas = entradas.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const totalSaidas = saidas.reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const contasPendentes = contas.filter((conta) => conta.status !== "paga");
  const contasPagas = contas.filter((conta) => conta.status === "paga");

  const totalContasPendentes = contasPendentes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const totalContasPagas = contasPagas.reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const caixaAtual = totalEntradas - totalSaidas - totalContasPagas;

  return {
    totalEntradas,
    totalSaidas,
    contasPendentes,
    contasPagas,
    totalContasPendentes,
    totalContasPagas,
    caixaAtual
  };
}

/* ABAS */

function openTab(tab, botao = null) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const tela = pegar(tab);
  if (tela) tela.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  if (botao) {
    botao.classList.add("active");
  }

  const appContainer = document.querySelector(".app");

  if (appContainer) {
    appContainer.classList.remove(
      "bg-home",
      "bg-bills",
      "bg-goals",
      "bg-calendar",
      "bg-transactions",
      "bg-insights"
    );

    appContainer.classList.add(`bg-${tab}`);
  }
}

/* ADICIONAR DADOS */

async function adicionarEntrada() {
  const nomeInput = pegar("entradaNome");
  const valorInput = pegar("entradaValor");

  const nome = nomeInput.value.trim();
  const valor = Number(valorInput.value);

  if (!nome || valor <= 0) {
    alert("Preencha o nome e o valor da entrada.");
    return;
  }

  entradas.push({
    id: Date.now() + Math.random(),
    nome,
    valor,
    data: new Date().toLocaleDateString("pt-BR")
  });

  nomeInput.value = "";
  valorInput.value = "";

  await salvarDados();
  atualizarTela();
}

async function adicionarSaida() {
  const nomeInput = pegar("saidaNome");
  const valorInput = pegar("saidaValor");

  const nome = nomeInput.value.trim();
  const valor = Number(valorInput.value);

  if (!nome || valor <= 0) {
    alert("Preencha o nome e o valor da saída.");
    return;
  }

  saidas.push({
    id: Date.now() + Math.random(),
    nome,
    valor,
    data: new Date().toLocaleDateString("pt-BR")
  });

  nomeInput.value = "";
  valorInput.value = "";

  await salvarDados();
  atualizarTela();
}

async function adicionarConta() {
  const nome = pegar("contaNome").value.trim();
  const valor = Number(pegar("contaValor").value);
  const vencimento = pegar("contaVencimento").value;
  const categoria = pegar("contaCategoria").value;

  if (!nome || valor <= 0 || !vencimento) {
    alert("Preencha nome, valor e vencimento da conta.");
    return;
  }

  contas.push({
    id: Date.now() + Math.random(),
    nome,
    valor,
    vencimento,
    categoria,
    status: "pendente"
  });

  pegar("contaNome").value = "";
  pegar("contaValor").value = "";
  pegar("contaVencimento").value = "";
  pegar("contaCategoria").value = "Streaming";

  await salvarDados();
  atualizarTela();
}

async function adicionarMeta() {
  const nome = pegar("metaNome").value.trim();
  const valorTotal = Number(pegar("metaValorTotal").value);
  const valorAtual = Number(pegar("metaValorAtual").value);

  if (!nome || valorTotal <= 0) {
    alert("Preencha o nome e o valor total da meta.");
    return;
  }

  metas.push({
    id: Date.now() + Math.random(),
    nome,
    valorTotal,
    valorAtual: valorAtual || 0
  });

  pegar("metaNome").value = "";
  pegar("metaValorTotal").value = "";
  pegar("metaValorAtual").value = "";

  await salvarDados();
  atualizarTela();
}

/* AÇÕES CONTAS */

async function marcarContaPaga(index) {
  if (!contas[index]) return;

  contas[index].status = contas[index].status === "paga" ? "pendente" : "paga";

  await salvarDados();
  atualizarTela();
}

async function editarConta(index) {
  const conta = contas[index];

  if (!conta) return;

  const novoNome = prompt("Nome da conta:", conta.nome);
  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    alert("O nome da conta não pode ficar vazio.");
    return;
  }

  const novoValor = prompt("Valor da conta:", conta.valor);
  if (novoValor === null) return;

  const valorFinal = converterValorDigitado(novoValor);

  if (isNaN(valorFinal) || valorFinal <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  const novoVencimento = prompt(
    "Data de vencimento no formato AAAA-MM-DD:",
    conta.vencimento
  );

  if (novoVencimento === null) return;

  const vencimentoFinal = novoVencimento.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimentoFinal)) {
    alert("Use o formato correto: AAAA-MM-DD. Exemplo: 2026-06-15");
    return;
  }

  const novaCategoria = prompt(
    "Categoria: Streaming, Internet, Apps, Pessoa, Serviço, Moradia ou Outro",
    conta.categoria
  );

  if (novaCategoria === null) return;

  const categoriaFinal = novaCategoria.trim();

  const categoriasPermitidas = [
    "Streaming",
    "Internet",
    "Apps",
    "Pessoa",
    "Serviço",
    "Moradia",
    "Outro"
  ];

  const categoriaFormatada =
    categoriasPermitidas.find(
      (cat) => cat.toLowerCase() === categoriaFinal.toLowerCase()
    ) || "Outro";

  contas[index] = {
    ...conta,
    nome: nomeFinal,
    valor: valorFinal,
    vencimento: vencimentoFinal,
    categoria: categoriaFormatada
  };

  await salvarDados();
  atualizarTela();
}

async function excluirConta(index) {
  if (!contas[index]) return;

  contas.splice(index, 1);

  await salvarDados();
  atualizarTela();
}

/* AÇÕES GERAIS */

async function excluirEntrada(id) {
  entradas = entradas.filter((item) => item.id !== id);
  await salvarDados();
  atualizarTela();
}

async function excluirSaida(id) {
  saidas = saidas.filter((item) => item.id !== id);
  await salvarDados();
  atualizarTela();
}

async function excluirMeta(id) {
  metas = metas.filter((meta) => meta.id !== id);
  await salvarDados();
  atualizarTela();
}

async function editarMeta(id) {
  const meta = metas.find((item) => item.id === id);

  if (!meta) return;

  const novoValor = prompt(
    `Quanto você tem guardado agora para "${meta.nome}"?`,
    meta.valorAtual || 0
  );

  if (novoValor === null) return;

  const valorConvertido = converterValorDigitado(novoValor);

  if (isNaN(valorConvertido) || valorConvertido < 0) {
    alert("Digite um valor válido.");
    return;
  }

  meta.valorAtual = valorConvertido;

  await salvarDados();
  atualizarTela();
}

async function apagarTudo() {
  const confirmar = confirm("Tem certeza que deseja apagar todos os dados da V2?");

  if (!confirmar) return;

  entradas = [];
  saidas = [];
  contas = [];
  metas = [];

  await salvarDados();
  atualizarTela();
}

/* ATUALIZAR TELA */

function atualizarTela() {
  const resumo = calcularResumo();

  escrever("caixaAtual", moeda(resumo.caixaAtual));
  escrever("totalGanhos", moeda(resumo.totalEntradas));
  escrever("totalSaidas", moeda(resumo.totalSaidas));
  escrever("totalContasPendentes", moeda(resumo.totalContasPendentes));
  escrever("totalMetas", metas.length);

  escrever("resumoContas", moeda(resumo.totalContasPendentes));
  escrever("qtdVencimentos", resumo.contasPendentes.length);

  escrever("insightEntradas", moeda(resumo.totalEntradas));
  escrever("insightSaidas", moeda(resumo.totalSaidas));
  escrever("insightDevido", moeda(resumo.totalContasPendentes));
  escrever("insightRegistros", entradas.length + saidas.length + contas.length + metas.length);

  escrever(
    "statusFinanceiro",
    resumo.caixaAtual >= 0 ? "Saldo operacional positivo" : "Atenção: caixa negativo"
  );

  atualizarTransacoes();
  atualizarContas();
  atualizarMetas();
  atualizarCalendario();
  atualizarHome();
}

/* TRANSAÇÕES */

function atualizarTransacoes() {
  const lista = pegar("listaTransacoes");

  const transacoes = [
    ...entradas.map((item) => ({ ...item, tipo: "entrada" })),
    ...saidas.map((item) => ({ ...item, tipo: "saida" }))
  ].sort((a, b) => b.id - a.id);

  if (!transacoes.length) {
    lista.innerHTML = `<p class="empty">Nenhuma movimentação registrada.</p>`;
    return;
  }

  lista.innerHTML = transacoes.map((item) => {
    const positivo = item.tipo === "entrada";
    const funcao = positivo ? "excluirEntrada" : "excluirSaida";
    const iconeTransacao = positivo ? "icone-entradas.png" : "icone-saidas.png";
    const textoAlt = positivo ? "Entrada" : "Saída";

    return `
      <div class="item">
        <div class="item-icon">
          <img
            src="assets/${iconeTransacao}"
            alt="${textoAlt}"
            class="transaction-icon-img"
          >
        </div>

        <div>
          <h4>${item.nome}</h4>
          <small>${positivo ? "Entrada" : "Saída"} • ${item.data}</small>
        </div>

        <div>
          <strong>${positivo ? "+" : "-"} ${moeda(item.valor)}</strong>
          <div class="item-actions">
            <button onclick="${funcao}(${item.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* CONTAS */

function atualizarContas() {
  const lista = pegar("listaContas");

  if (!contas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma conta cadastrada.</p>`;
    return;
  }

  const contasOrdenadas = contas
    .map((conta, indexOriginal) => ({
      ...conta,
      indexOriginal
    }))
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  lista.innerHTML = contasOrdenadas
    .map((conta) => {
      const estaPaga = conta.status === "paga";

      return `
        <div class="item conta-item ${estaPaga ? "conta-paga" : ""}">
          <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

          <div>
            <h4>${conta.nome}</h4>
            <small>${conta.categoria} • ${textoDias(conta.vencimento, estaPaga)}</small>
          </div>

          <div>
            <strong>${moeda(conta.valor)}</strong>
            <div class="item-actions">
              <button onclick="marcarContaPaga(${conta.indexOriginal})">
                ${estaPaga ? "Reabrir" : "Pagar"}
              </button>
              <button onclick="editarConta(${conta.indexOriginal})">Editar</button>
              <button onclick="excluirConta(${conta.indexOriginal})">Excluir</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* METAS */

function atualizarMetas() {
  const lista = pegar("listaMetas");

  if (!metas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma meta cadastrada.</p>`;
    return;
  }

  lista.innerHTML = metas.map((meta) => {
    const progresso = meta.valorTotal > 0
      ? Math.min((meta.valorAtual / meta.valorTotal) * 100, 100)
      : 0;

    const falta = Math.max(meta.valorTotal - meta.valorAtual, 0);

    return `
      <div class="goal-card glass-card">
        <h3>${meta.nome}</h3>

        <div class="goal-info">
          <span>${moeda(meta.valorAtual)} guardado</span>
          <span>Falta ${moeda(falta)}</span>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width:${progresso}%"></div>
        </div>

        <div class="item-actions">
          <button onclick="editarMeta(${meta.id})">Editar</button>
          <button onclick="excluirMeta(${meta.id})">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

/* CALENDÁRIO */

function atualizarCalendario() {
  const lista = pegar("listaCalendario");

  const ordenadas = [...contas].sort((a, b) => {
    return new Date(a.vencimento) - new Date(b.vencimento);
  });

  if (!ordenadas.length) {
    lista.innerHTML = `<p class="empty">Nenhum vencimento cadastrado.</p>`;
    return;
  }

  lista.innerHTML = ordenadas.map((conta) => {
    const estaPaga = conta.status === "paga";

    return `
      <div class="item conta-item ${estaPaga ? "conta-paga" : ""}">
        <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

        <div>
          <h4>${conta.nome}</h4>
          <small>${textoDias(conta.vencimento, estaPaga)}</small>
        </div>

        <div>
          <strong>${moeda(conta.valor)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

/* HOME */

function atualizarHome() {
  const proximos = pegar("listaProximosVencimentos");
  const metaDestaque = pegar("metaDestaque");

  const contasPendentes = contas
    .filter((conta) => conta.status !== "paga")
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .slice(0, 3);

  if (!contasPendentes.length) {
    proximos.innerHTML = `<p class="empty">Nenhum vencimento pendente.</p>`;
  } else {
    proximos.innerHTML = contasPendentes.map((conta) => {
      return `
        <div class="item">
          <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

          <div>
            <h4>${conta.nome}</h4>
            <small>${textoDias(conta.vencimento)}</small>
          </div>

          <div>
            <strong>${moeda(conta.valor)}</strong>
          </div>
        </div>
      `;
    }).join("");
  }

  if (!metas.length) {
    metaDestaque.innerHTML = `<p class="empty">Nenhuma meta criada ainda.</p>`;
  } else {
    const meta = metas[0];

    const progresso = meta.valorTotal > 0
      ? Math.min((meta.valorAtual / meta.valorTotal) * 100, 100)
      : 0;

    const falta = Math.max(meta.valorTotal - meta.valorAtual, 0);

    metaDestaque.innerHTML = `
      <div class="goal-card glass-card">
        <h3>${meta.nome}</h3>

        <div class="goal-info">
          <span>${Math.round(progresso)}% completo</span>
          <span>Falta ${moeda(falta)}</span>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width:${progresso}%"></div>
        </div>

        <div class="item-actions">
          <button onclick="editarMeta(${meta.id})">Editar</button>
        </div>
      </div>
    `;
  }
}

/* SPLASH */

function iniciarSplashV2() {
  const splash = pegar("splashScreen");
  const percent = pegar("loadingPercent");
  const bar = pegar("loadingBar");

  if (!splash || !percent || !bar) return;

  let progresso = 0;

  const intervalo = setInterval(() => {
    progresso++;

    percent.textContent = String(progresso).padStart(3, "0") + "%";
    bar.style.width = progresso + "%";

    if (progresso >= 100) {
      clearInterval(intervalo);

      setTimeout(() => {
        splash.classList.add("hide");
      }, 350);
    }
  }, 22);
}

/* EXPOR FUNÇÕES PARA O HTML */

window.openTab = openTab;
window.adicionarEntrada = adicionarEntrada;
window.adicionarSaida = adicionarSaida;
window.adicionarConta = adicionarConta;
window.adicionarMeta = adicionarMeta;
window.marcarContaPaga = marcarContaPaga;
window.editarConta = editarConta;
window.excluirConta = excluirConta;
window.excluirEntrada = excluirEntrada;
window.excluirSaida = excluirSaida;
window.excluirMeta = excluirMeta;
window.editarMeta = editarMeta;
window.apagarTudo = apagarTudo;

/* INICIAR APP */

document.addEventListener("DOMContentLoaded", () => {
  iniciarSplashV2();
  carregarDados();
});
