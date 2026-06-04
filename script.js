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

let filtroContasAtual = "todas";
let filtroEntradasAtual = "mes";
let filtroSaidasAtual = "mes";

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

function converterDataBRParaDate(dataBR) {
  if (!dataBR) return null;

  const partes = dataBR.split("/");
  if (partes.length !== 3) return null;

  const dia = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const ano = Number(partes[2]);

  const data = new Date(ano, mes, dia);
  data.setHours(0, 0, 0, 0);

  return data;
}

function estaNoPeriodo(dataBR, filtro) {
  if (filtro === "todos") return true;

  const data = converterDataBRParaDate(dataBR);
  if (!data) return true;

  const hoje = hojeSemHora();

  if (filtro === "hoje") {
    return data.getTime() === hoje.getTime();
  }

  if (filtro === "semana") {
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    return data >= inicioSemana && data <= fimSemana;
  }

  if (filtro === "mes") {
    return (
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    );
  }

  return true;
}

function estaNoMesAtual(dataBR) {
  const data = converterDataBRParaDate(dataBR);
  if (!data) return false;

  const hoje = new Date();

  return (
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  );
}

function vencimentoNoMesAtual(vencimento) {
  if (!vencimento) return false;

  const data = new Date(vencimento + "T00:00:00");
  const hoje = new Date();

  return (
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  );
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
  const saldoProjetado = caixaAtual - totalContasPendentes;

  return {
    totalEntradas,
    totalSaidas,
    contasPendentes,
    contasPagas,
    totalContasPendentes,
    totalContasPagas,
    caixaAtual,
    saldoProjetado
  };
}

function calcularResumoMensal() {
  const entradasDoMes = entradas.filter((item) => estaNoMesAtual(item.data));
  const saidasDoMes = saidas.filter((item) => estaNoMesAtual(item.data));

  const contasDoMes = contas.filter((conta) => vencimentoNoMesAtual(conta.vencimento));

  const contasPendentesDoMes = contasDoMes.filter((conta) => conta.status !== "paga");
  const contasPagasDoMes = contasDoMes.filter((conta) => conta.status === "paga");

  const totalEntradas = entradasDoMes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const totalSaidas = saidasDoMes.reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const totalContasPendentes = contasPendentesDoMes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const totalContasPagas = contasPagasDoMes.reduce((soma, item) => soma + Number(item.valor || 0), 0);

  const caixaAtual = totalEntradas - totalSaidas - totalContasPagas;
  const saldoProjetado = caixaAtual - totalContasPendentes;

  return {
    totalEntradas,
    totalSaidas,
    contasPendentes: contasPendentesDoMes,
    contasPagas: contasPagasDoMes,
    totalContasPendentes,
    totalContasPagas,
    caixaAtual,
    saldoProjetado
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
      "bg-income",
      "bg-expenses",
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

/* AÇÕES ENTRADAS */

async function editarEntrada(id) {
  const entrada = entradas.find((item) => item.id === id);

  if (!entrada) return;

  const novoNome = prompt("Nome do ganho:", entrada.nome);
  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    alert("O nome do ganho não pode ficar vazio.");
    return;
  }

  const novoValor = prompt("Valor recebido:", entrada.valor);
  if (novoValor === null) return;

  const valorFinal = converterValorDigitado(novoValor);

  if (isNaN(valorFinal) || valorFinal <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  entrada.nome = nomeFinal;
  entrada.valor = valorFinal;

  await salvarDados();
  atualizarTela();
}

async function excluirEntrada(id) {
  entradas = entradas.filter((item) => item.id !== id);
  await salvarDados();
  atualizarTela();
}

/* AÇÕES SAÍDAS */

async function editarSaida(id) {
  const saida = saidas.find((item) => item.id === id);

  if (!saida) return;

  const novoNome = prompt("Nome da saída:", saida.nome);
  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    alert("O nome da saída não pode ficar vazio.");
    return;
  }

  const novoValor = prompt("Valor gasto:", saida.valor);
  if (novoValor === null) return;

  const valorFinal = converterValorDigitado(novoValor);

  if (isNaN(valorFinal) || valorFinal <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  saida.nome = nomeFinal;
  saida.valor = valorFinal;

  await salvarDados();
  atualizarTela();
}

async function excluirSaida(id) {
  saidas = saidas.filter((item) => item.id !== id);
  await salvarDados();
  atualizarTela();
}

/* AÇÕES METAS */

async function adicionarValorMeta(id) {
  const meta = metas.find((item) => item.id === id);

  if (!meta) return;

  const valorAdicionar = prompt(
    `Quanto você quer adicionar na meta "${meta.nome}"?`,
    0
  );

  if (valorAdicionar === null) return;

  const valorConvertido = converterValorDigitado(valorAdicionar);

  if (isNaN(valorConvertido) || valorConvertido <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  meta.valorAtual = Number(meta.valorAtual || 0) + valorConvertido;

  if (meta.valorAtual > meta.valorTotal) {
    meta.valorAtual = meta.valorTotal;
  }

  await salvarDados();
  atualizarTela();
}

async function editarMeta(id) {
  const meta = metas.find((item) => item.id === id);

  if (!meta) return;

  const novoNome = prompt("Nome da meta:", meta.nome);
  if (novoNome === null) return;

  const nomeFinal = novoNome.trim();

  if (!nomeFinal) {
    alert("O nome da meta não pode ficar vazio.");
    return;
  }

  const novoValorTotal = prompt("Valor total da meta:", meta.valorTotal);
  if (novoValorTotal === null) return;

  const valorTotalFinal = converterValorDigitado(novoValorTotal);

  if (isNaN(valorTotalFinal) || valorTotalFinal <= 0) {
    alert("Digite um valor total válido.");
    return;
  }

  const novoValorAtual = prompt("Valor já guardado:", meta.valorAtual || 0);
  if (novoValorAtual === null) return;

  let valorAtualFinal = converterValorDigitado(novoValorAtual);

  if (isNaN(valorAtualFinal) || valorAtualFinal < 0) {
    alert("Digite um valor guardado válido.");
    return;
  }

  if (valorAtualFinal > valorTotalFinal) {
    valorAtualFinal = valorTotalFinal;
  }

  meta.nome = nomeFinal;
  meta.valorTotal = valorTotalFinal;
  meta.valorAtual = valorAtualFinal;

  await salvarDados();
  atualizarTela();
}

async function excluirMeta(id) {
  metas = metas.filter((meta) => meta.id !== id);
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

/* FILTROS CONTAS */

function aplicarFiltroContas(filtro) {
  filtroContasAtual = filtro;
  atualizarContas();
}

function criarFiltrosContas() {
  const lista = pegar("listaContas");
  if (!lista) return;

  const painelLista = lista.closest(".panel");
  if (!painelLista) return;

  let filtros = pegar("filtrosContas");

  if (!filtros) {
    filtros = document.createElement("div");
    filtros.id = "filtrosContas";
    filtros.className = "bill-filters";

    filtros.innerHTML = `
      <button type="button" data-filter="todas" onclick="aplicarFiltroContas('todas')">Todas</button>
      <button type="button" data-filter="pendentes" onclick="aplicarFiltroContas('pendentes')">Pendentes</button>
      <button type="button" data-filter="pagas" onclick="aplicarFiltroContas('pagas')">Pagas</button>
      <button type="button" data-filter="atrasadas" onclick="aplicarFiltroContas('atrasadas')">Atrasadas</button>
    `;

    painelLista.parentNode.insertBefore(filtros, painelLista);
  }

  filtros.querySelectorAll("button").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.filter === filtroContasAtual);
  });
}

function filtrarContasParaTela(lista) {
  if (filtroContasAtual === "pendentes") {
    return lista.filter((conta) => conta.status !== "paga");
  }

  if (filtroContasAtual === "pagas") {
    return lista.filter((conta) => conta.status === "paga");
  }

  if (filtroContasAtual === "atrasadas") {
    return lista.filter((conta) => conta.status !== "paga" && calcularDias(conta.vencimento) < 0);
  }

  return lista;
}

/* FILTROS PERÍODO */

function criarFiltrosPeriodo(tipo) {
  const lista = tipo === "entradas" ? pegar("listaEntradas") : pegar("listaSaidas");
  if (!lista) return;

  const painel = lista.closest(".panel");
  if (!painel) return;

  const idFiltro = tipo === "entradas" ? "filtrosEntradas" : "filtrosSaidas";

  let filtros = pegar(idFiltro);

  if (!filtros) {
    filtros = document.createElement("div");
    filtros.id = idFiltro;
    filtros.className = "period-filters";

    const funcao = tipo === "entradas" ? "aplicarFiltroEntradas" : "aplicarFiltroSaidas";

    filtros.innerHTML = `
      <button type="button" data-filter="hoje" onclick="${funcao}('hoje')">Hoje</button>
      <button type="button" data-filter="semana" onclick="${funcao}('semana')">Semana</button>
      <button type="button" data-filter="mes" onclick="${funcao}('mes')">Mês</button>
      <button type="button" data-filter="todos" onclick="${funcao}('todos')">Todos</button>
    `;

    const listaElemento = painel.querySelector(".list");
    painel.insertBefore(filtros, listaElemento);
  }

  const filtroAtual = tipo === "entradas" ? filtroEntradasAtual : filtroSaidasAtual;

  filtros.querySelectorAll("button").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.filter === filtroAtual);
  });
}

function aplicarFiltroEntradas(filtro) {
  filtroEntradasAtual = filtro;
  atualizarEntradas();
}

function aplicarFiltroSaidas(filtro) {
  filtroSaidasAtual = filtro;
  atualizarSaidas();
}

/* RESUMO MENSAL */

function mensagemResumoMensal(resumo) {
  if (resumo.caixaAtual >= 0 && resumo.saldoProjetado >= 0) {
    return "Seu mês está sob controle. Mesmo pagando as contas pendentes, o saldo continua positivo.";
  }

  if (resumo.caixaAtual >= 0 && resumo.saldoProjetado < 0) {
    return "Seu caixa está positivo agora, mas ficará negativo se todas as contas pendentes forem pagas.";
  }

  if (resumo.caixaAtual < 0) {
    return "Atenção: seu caixa atual está negativo. Priorize entradas ou reduza saídas antes de novos compromissos.";
  }

  return "Resumo mensal atualizado com base nos registros atuais.";
}

function criarResumoMensalNaHome(resumo) {
  const home = pegar("home");
  if (!home) return;

  let bloco = pegar("resumoMensalHome");

  if (!bloco) {
    bloco = document.createElement("section");
    bloco.id = "resumoMensalHome";
    bloco.className = "panel glass-card monthly-summary-panel";

    const metricsGrid = home.querySelector(".metrics-grid");

    if (metricsGrid && metricsGrid.nextSibling) {
      home.insertBefore(bloco, metricsGrid.nextSibling);
    } else {
      home.appendChild(bloco);
    }
  }

  bloco.innerHTML = `
    <div class="panel-head monthly-summary-head">
      <div>
        <h3>Resumo mensal</h3>
        <p>Leitura estratégica do mês atual</p>
      </div>
      <span>${new Date().toLocaleDateString("pt-BR", { month: "long" })}</span>
    </div>

    <div class="monthly-summary-grid">
      <div class="monthly-summary-item">
        <span>Entradas</span>
        <strong>${moeda(resumo.totalEntradas)}</strong>
      </div>

      <div class="monthly-summary-item">
        <span>Saídas</span>
        <strong>${moeda(resumo.totalSaidas)}</strong>
      </div>

      <div class="monthly-summary-item">
        <span>Contas pagas</span>
        <strong>${moeda(resumo.totalContasPagas)}</strong>
      </div>

      <div class="monthly-summary-item">
        <span>Contas pendentes</span>
        <strong>${moeda(resumo.totalContasPendentes)}</strong>
      </div>

      <div class="monthly-summary-item highlight">
        <span>Saldo atual</span>
        <strong>${moeda(resumo.caixaAtual)}</strong>
      </div>

      <div class="monthly-summary-item ${resumo.saldoProjetado < 0 ? "negative" : "positive"}">
        <span>Saldo projetado</span>
        <strong>${moeda(resumo.saldoProjetado)}</strong>
      </div>
    </div>

    <div class="monthly-summary-message ${resumo.saldoProjetado < 0 ? "warning" : "safe"}">
      ${mensagemResumoMensal(resumo)}
    </div>
  `;
}

/* ATUALIZAR TELA */

function atualizarTela() {
  const resumo = calcularResumo();
  const resumoMensal = calcularResumoMensal();

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

  atualizarEntradas();
  atualizarSaidas();
  atualizarContas();
  atualizarMetas();
  atualizarCalendario();
  atualizarHome();
  criarResumoMensalNaHome(resumoMensal);
}

/* GANHOS */

function atualizarEntradas() {
  const lista = pegar("listaEntradas");

  if (!lista) return;

  criarFiltrosPeriodo("entradas");

  if (!entradas.length) {
    lista.innerHTML = `<p class="empty">Nenhum ganho registrado.</p>`;
    escrever("resumoGanhosTela", moeda(0));
    return;
  }

  const filtradas = entradas
    .filter((item) => estaNoPeriodo(item.data, filtroEntradasAtual))
    .sort((a, b) => b.id - a.id);

  const totalFiltrado = filtradas.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  escrever("resumoGanhosTela", moeda(totalFiltrado));

  if (!filtradas.length) {
    lista.innerHTML = `<p class="empty">Nenhum ganho encontrado neste período.</p>`;
    return;
  }

  lista.innerHTML = filtradas.map((item) => {
    return `
      <div class="item transaction-item">
        <div class="item-icon">
          <img src="assets/icone-entradas.png" alt="Entrada" class="transaction-icon-img">
        </div>

        <div>
          <h4>${item.nome}</h4>
          <small>Entrada • ${item.data}</small>
        </div>

        <div>
          <strong>+ ${moeda(item.valor)}</strong>
          <div class="item-actions transaction-actions">
            <button onclick="editarEntrada(${item.id})">Editar</button>
            <button onclick="excluirEntrada(${item.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* SAÍDAS */

function atualizarSaidas() {
  const lista = pegar("listaSaidas");

  if (!lista) return;

  criarFiltrosPeriodo("saidas");

  if (!saidas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma saída registrada.</p>`;
    escrever("resumoSaidasTela", moeda(0));
    return;
  }

  const filtradas = saidas
    .filter((item) => estaNoPeriodo(item.data, filtroSaidasAtual))
    .sort((a, b) => b.id - a.id);

  const totalFiltrado = filtradas.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  escrever("resumoSaidasTela", moeda(totalFiltrado));

  if (!filtradas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma saída encontrada neste período.</p>`;
    return;
  }

  lista.innerHTML = filtradas.map((item) => {
    return `
      <div class="item transaction-item">
        <div class="item-icon">
          <img src="assets/icone-saidas.png" alt="Saída" class="transaction-icon-img">
        </div>

        <div>
          <h4>${item.nome}</h4>
          <small>Saída • ${item.data}</small>
        </div>

        <div>
          <strong>- ${moeda(item.valor)}</strong>
          <div class="item-actions transaction-actions">
            <button onclick="editarSaida(${item.id})">Editar</button>
            <button onclick="excluirSaida(${item.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* CONTAS */

function atualizarContas() {
  const lista = pegar("listaContas");

  if (!lista) return;

  criarFiltrosContas();

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

  const contasFiltradas = filtrarContasParaTela(contasOrdenadas);

  if (!contasFiltradas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma conta encontrada neste filtro.</p>`;
    return;
  }

  lista.innerHTML = contasFiltradas
    .map((conta) => {
      const estaPaga = conta.status === "paga";
      const estaAtrasada = !estaPaga && calcularDias(conta.vencimento) < 0;

      return `
        <div class="item conta-item ${estaPaga ? "conta-paga" : ""} ${estaAtrasada ? "agenda-atrasada" : ""}">
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

/* METAS PREMIUM */

function criarCardMeta(meta) {
  const progresso = meta.valorTotal > 0
    ? Math.min((Number(meta.valorAtual || 0) / Number(meta.valorTotal || 0)) * 100, 100)
    : 0;

  const porcentagem = Math.round(progresso);
  const falta = Math.max(Number(meta.valorTotal || 0) - Number(meta.valorAtual || 0), 0);
  const concluida = progresso >= 100;

  return `
    <div class="goal-card glass-card goal-card-premium ${concluida ? "goal-complete" : ""}">
      <div class="goal-title-column">
        <span class="goal-status">${concluida ? "META CONCLUÍDA" : "META EM ANDAMENTO"}</span>
        <h3>${meta.nome}</h3>
      </div>

      <div class="goal-premium-values">
        <div>
          <span>Guardado</span>
          <strong>${moeda(meta.valorAtual)}</strong>
        </div>

        <div>
          <span>Falta</span>
          <strong>${moeda(falta)}</strong>
        </div>

        <div>
          <span>Meta</span>
          <strong>${moeda(meta.valorTotal)}</strong>
        </div>
      </div>

      <div class="goal-progress-row">
        <div class="progress-track goal-progress-track">
          <div class="progress-fill" style="width:${progresso}%"></div>
        </div>

        <strong class="goal-percent-small">${porcentagem}%</strong>
      </div>

      <div class="goal-actions-premium">
        ${concluida ? "" : `<button onclick="adicionarValorMeta(${meta.id})">Adicionar valor</button>`}
        <button onclick="editarMeta(${meta.id})">Editar</button>
        <button onclick="excluirMeta(${meta.id})">Excluir</button>
      </div>
    </div>
  `;
}

function atualizarMetas() {
  const lista = pegar("listaMetas");

  if (!lista) return;

  if (!metas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma meta cadastrada.</p>`;
    return;
  }

  const metasEmAndamento = metas.filter((meta) => {
    const progresso = meta.valorTotal > 0
      ? (Number(meta.valorAtual || 0) / Number(meta.valorTotal || 0)) * 100
      : 0;

    return progresso < 100;
  });

  const metasConcluidas = metas.filter((meta) => {
    const progresso = meta.valorTotal > 0
      ? (Number(meta.valorAtual || 0) / Number(meta.valorTotal || 0)) * 100
      : 0;

    return progresso >= 100;
  });

  let html = "";

  if (metasEmAndamento.length) {
    html += `
      <div class="goal-section-title">Em andamento</div>
      ${metasEmAndamento.map((meta) => criarCardMeta(meta)).join("")}
    `;
  }

  if (metasConcluidas.length) {
    html += `
      <div class="goal-section-title">Concluídas</div>
      ${metasConcluidas.map((meta) => criarCardMeta(meta)).join("")}
    `;
  }

  lista.innerHTML = html;
}

/* AGENDA */

function montarGrupoAgenda(titulo, listaDeContas) {
  if (!listaDeContas.length) return "";

  const itens = listaDeContas.map((conta) => {
    const estaPaga = conta.status === "paga";
    const estaAtrasada = !estaPaga && calcularDias(conta.vencimento) < 0;

    return `
      <div class="item conta-item ${estaPaga ? "conta-paga" : ""} ${estaAtrasada ? "agenda-atrasada" : ""}">
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

  return `
    <div class="agenda-group">
      <h3>${titulo}</h3>
      <div class="list">${itens}</div>
    </div>
  `;
}

function atualizarCalendario() {
  const lista = pegar("listaCalendario");

  if (!lista) return;

  if (!contas.length) {
    lista.innerHTML = `<p class="empty">Nenhum vencimento cadastrado.</p>`;
    return;
  }

  const ordenadas = [...contas].sort((a, b) => {
    return new Date(a.vencimento) - new Date(b.vencimento);
  });

  const atrasadas = [];
  const hoje = [];
  const proximos7Dias = [];
  const esteMes = [];
  const pagas = [];

  ordenadas.forEach((conta) => {
    const dias = calcularDias(conta.vencimento);

    if (conta.status === "paga") {
      pagas.push(conta);
      return;
    }

    if (dias < 0) {
      atrasadas.push(conta);
    } else if (dias === 0) {
      hoje.push(conta);
    } else if (dias > 0 && dias <= 7) {
      proximos7Dias.push(conta);
    } else {
      esteMes.push(conta);
    }
  });

  const html =
    montarGrupoAgenda("Atrasadas", atrasadas) +
    montarGrupoAgenda("Vence hoje", hoje) +
    montarGrupoAgenda("Próximos 7 dias", proximos7Dias) +
    montarGrupoAgenda("Este mês", esteMes) +
    montarGrupoAgenda("Pagas", pagas);

  lista.innerHTML = html || `<p class="empty">Nenhum vencimento encontrado.</p>`;
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
    const metasOrdenadas = [...metas].sort((a, b) => {
      const progressoA = a.valorTotal > 0 ? (a.valorAtual / a.valorTotal) * 100 : 0;
      const progressoB = b.valorTotal > 0 ? (b.valorAtual / b.valorTotal) * 100 : 0;

      return progressoB - progressoA;
    });

    metaDestaque.innerHTML = criarCardMeta(metasOrdenadas[0]);
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
window.editarEntrada = editarEntrada;
window.excluirEntrada = excluirEntrada;
window.editarSaida = editarSaida;
window.excluirSaida = excluirSaida;
window.excluirMeta = excluirMeta;
window.editarMeta = editarMeta;
window.adicionarValorMeta = adicionarValorMeta;
window.apagarTudo = apagarTudo;
window.aplicarFiltroContas = aplicarFiltroContas;
window.aplicarFiltroEntradas = aplicarFiltroEntradas;
window.aplicarFiltroSaidas = aplicarFiltroSaidas;

/* INICIAR APP */

document.addEventListener("DOMContentLoaded", () => {
  iniciarSplashV2();
  carregarDados();
});
