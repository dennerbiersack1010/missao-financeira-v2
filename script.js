import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
   FIREBASE
========================= */

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

/* =========================
   ESTADO
========================= */

let entradas = [];
let saidas = [];
let contas = [];
let metas = [];

let filtroContasAtual = "todas";
let filtroEntradasAtual = "mes";
let filtroSaidasAtual = "mes";

let mesResumoSelecionado = new Date().getMonth();
let anoResumoSelecionado = new Date().getFullYear();

let contaEditandoIndex = null;
let metaEditandoId = null;
let transacaoEditandoTipo = null;
let transacaoEditandoId = null;

/* =========================
   HELPERS
========================= */

function pegar(id) {
  return document.getElementById(id);
}

function escrever(id, texto) {
  const el = pegar(id);
  if (el) el.textContent = texto;
}

function escreverValor(id, valor) {
  const el = pegar(id);
  if (el) el.value = valor;
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function numero(valor) {
  return Number(valor || 0);
}

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function hojeSemHora() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function validarDataBR(data) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(data);
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

function calcularDias(vencimento) {
  if (!vencimento) return null;

  const hoje = hojeSemHora();
  const data = new Date(vencimento + "T00:00:00");

  if (isNaN(data.getTime())) return null;

  const diff = data - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function textoDias(vencimento, paga = false, pagaEm = null) {
  if (paga) {
    return pagaEm ? `Paga em ${pagaEm}` : "Conta paga";
  }

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

  if (isNaN(data.getTime())) return null;

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

function dataBRNoMes(dataBR, mes, ano) {
  const data = converterDataBRParaDate(dataBR);
  if (!data) return false;

  return data.getMonth() === mes && data.getFullYear() === ano;
}

function vencimentoNoMes(vencimento, mes, ano) {
  if (!vencimento) return false;

  const data = new Date(vencimento + "T00:00:00");
  if (isNaN(data.getTime())) return false;

  return data.getMonth() === mes && data.getFullYear() === ano;
}

function contaPagaNoMes(conta, mes, ano) {
  if (!conta || conta.status !== "paga") return false;

  if (conta.pagaEm) {
    return dataBRNoMes(conta.pagaEm, mes, ano);
  }

  return vencimentoNoMes(conta.vencimento, mes, ano);
}

/* =========================
   ÍCONES
========================= */

function iconeConta(nome, categoria) {
  const texto = `${nome || ""} ${categoria || ""}`.toLowerCase();

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

  return `<img src="assets/${arquivo}" alt="${categoria || "Conta"}" class="account-icon-img">`;
}

/* =========================
   FIRESTORE
========================= */

async function carregarDados() {
  try {
    const snapshot = await getDoc(documentoRef);

    if (snapshot.exists()) {
      const dados = snapshot.data();

      entradas = Array.isArray(dados.entradas) ? dados.entradas : [];
      saidas = Array.isArray(dados.saidas) ? dados.saidas : [];
      contas = Array.isArray(dados.contas) ? dados.contas : [];
      metas = Array.isArray(dados.metas) ? dados.metas : [];
    } else {
      await salvarDados();
    }

    atualizarTela();
  } catch (erro) {
    console.error("Erro ao carregar Firebase:", erro);
    alert("Erro ao carregar dados.");
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
    alert("Erro ao salvar dados.");
  }
}

/* =========================
   CÁLCULOS
========================= */

function calcularResumo() {
  const totalEntradas = entradas.reduce((soma, item) => soma + numero(item.valor), 0);
  const totalSaidas = saidas.reduce((soma, item) => soma + numero(item.valor), 0);

  const contasPendentes = contas.filter((conta) => conta.status !== "paga");
  const contasPagas = contas.filter((conta) => conta.status === "paga");

  const totalContasPendentes = contasPendentes.reduce((soma, item) => soma + numero(item.valor), 0);
  const totalContasPagas = contasPagas.reduce((soma, item) => soma + numero(item.valor), 0);

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

function calcularResumoMensal(mes = mesResumoSelecionado, ano = anoResumoSelecionado) {
  const entradasDoMes = entradas.filter((item) => dataBRNoMes(item.data, mes, ano));
  const saidasDoMes = saidas.filter((item) => dataBRNoMes(item.data, mes, ano));

  const contasPendentesDoMes = contas.filter((conta) => {
    return conta.status !== "paga" && vencimentoNoMes(conta.vencimento, mes, ano);
  });

  const contasPagasDoMes = contas.filter((conta) => {
    return contaPagaNoMes(conta, mes, ano);
  });

  const totalEntradas = entradasDoMes.reduce((soma, item) => soma + numero(item.valor), 0);
  const totalSaidas = saidasDoMes.reduce((soma, item) => soma + numero(item.valor), 0);
  const totalContasPendentes = contasPendentesDoMes.reduce((soma, item) => soma + numero(item.valor), 0);
  const totalContasPagas = contasPagasDoMes.reduce((soma, item) => soma + numero(item.valor), 0);

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
    saldoProjetado,
    mes,
    ano
  };
}

/* =========================
   ABAS
========================= */

function openTab(tab, botao = null) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const tela = pegar(tab);
  if (tela) tela.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  if (botao) botao.classList.add("active");
}

/* =========================
   ADICIONAR
========================= */

async function adicionarEntrada() {
  const nomeInput = pegar("entradaNome");
  const valorInput = pegar("entradaValor");

  if (!nomeInput || !valorInput) return;

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
    data: hojeBR()
  });

  nomeInput.value = "";
  valorInput.value = "";

  await salvarDados();
  atualizarTela();
}

async function adicionarSaida() {
  const nomeInput = pegar("saidaNome");
  const valorInput = pegar("saidaValor");

  if (!nomeInput || !valorInput) return;

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
    data: hojeBR()
  });

  nomeInput.value = "";
  valorInput.value = "";

  await salvarDados();
  atualizarTela();
}

async function adicionarConta() {
  const nomeInput = pegar("contaNome");
  const valorInput = pegar("contaValor");
  const vencimentoInput = pegar("contaVencimento");
  const categoriaInput = pegar("contaCategoria");

  if (!nomeInput || !valorInput || !vencimentoInput || !categoriaInput) return;

  const nome = nomeInput.value.trim();
  const valor = Number(valorInput.value);
  const vencimento = vencimentoInput.value;
  const categoria = categoriaInput.value;

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
    status: "pendente",
    pagaEm: null
  });

  nomeInput.value = "";
  valorInput.value = "";
  vencimentoInput.value = "";
  categoriaInput.value = "Streaming";

  await salvarDados();
  atualizarTela();
}

async function adicionarMeta() {
  const nomeInput = pegar("metaNome");
  const valorTotalInput = pegar("metaValorTotal");
  const valorAtualInput = pegar("metaValorAtual");

  if (!nomeInput || !valorTotalInput || !valorAtualInput) return;

  const nome = nomeInput.value.trim();
  const valorTotal = Number(valorTotalInput.value);
  const valorAtual = Number(valorAtualInput.value);

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

  nomeInput.value = "";
  valorTotalInput.value = "";
  valorAtualInput.value = "";

  await salvarDados();
  atualizarTela();
}

/* =========================
   AÇÕES
========================= */

async function marcarContaPaga(index) {
  if (!contas[index]) return;

  if (contas[index].status === "paga") {
    contas[index].status = "pendente";
    contas[index].pagaEm = null;
  } else {
    contas[index].status = "paga";
    contas[index].pagaEm = hojeBR();
  }

  await salvarDados();
  atualizarTela();
}

function editarConta(index) {
  abrirModalEditarConta(index);
}

async function excluirConta(index) {
  if (!contas[index]) return;

  if (!confirm("Excluir esta conta?")) return;

  contas.splice(index, 1);

  await salvarDados();
  atualizarTela();
}

function editarEntrada(id) {
  abrirModalEditarTransacao("entrada", id);
}

async function excluirEntrada(id) {
  if (!confirm("Excluir este ganho?")) return;

  entradas = entradas.filter((item) => item.id !== id);

  await salvarDados();
  atualizarTela();
}

function editarSaida(id) {
  abrirModalEditarTransacao("saida", id);
}

async function excluirSaida(id) {
  if (!confirm("Excluir esta saída?")) return;

  saidas = saidas.filter((item) => item.id !== id);

  await salvarDados();
  atualizarTela();
}

async function adicionarValorMeta(id) {
  const meta = metas.find((item) => item.id === id);
  if (!meta) return;

  const valorAdicionar = prompt(`Quanto você quer adicionar na meta "${meta.nome}"?`, "0");
  if (valorAdicionar === null) return;

  const valorConvertido = converterValorDigitado(valorAdicionar);

  if (isNaN(valorConvertido) || valorConvertido <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  meta.valorAtual = numero(meta.valorAtual) + valorConvertido;

  if (meta.valorAtual > meta.valorTotal) {
    meta.valorAtual = meta.valorTotal;
  }

  await salvarDados();
  atualizarTela();
}

function editarMeta(id) {
  abrirModalEditarMeta(id);
}

async function excluirMeta(id) {
  if (!confirm("Excluir esta meta?")) return;

  metas = metas.filter((meta) => meta.id !== id);

  await salvarDados();
  atualizarTela();
}

async function apagarTudo() {
  if (!confirm("Tem certeza que deseja apagar todos os dados?")) return;

  entradas = [];
  saidas = [];
  contas = [];
  metas = [];

  await salvarDados();
  atualizarTela();
}

/* =========================
   FILTROS
========================= */

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
    if (listaElemento) painel.insertBefore(filtros, listaElemento);
  }

  filtros.querySelectorAll("button").forEach((botao) => {
    const filtroAtual = tipo === "entradas" ? filtroEntradasAtual : filtroSaidasAtual;
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

/* =========================
   RESUMO MENSAL
========================= */

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

  const nomeMes = new Date(resumo.ano, resumo.mes, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  bloco.innerHTML = `
    <div class="panel-head monthly-summary-head">
      <div>
        <h3>Resumo mensal</h3>
        <p>Leitura estratégica do mês selecionado</p>
      </div>
    </div>

    <div class="month-selector">
      <button type="button" onclick="mudarMesResumo(-1)">‹</button>
      <strong>${nomeMes}</strong>
      <button type="button" onclick="mudarMesResumo(1)">›</button>
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

function mudarMesResumo(direcao) {
  mesResumoSelecionado += direcao;

  if (mesResumoSelecionado < 0) {
    mesResumoSelecionado = 11;
    anoResumoSelecionado--;
  }

  if (mesResumoSelecionado > 11) {
    mesResumoSelecionado = 0;
    anoResumoSelecionado++;
  }

  atualizarTela();
}

/* =========================
   BACKUP
========================= */

function criarAreaBackupNaHome() {
  const home = pegar("home");
  if (!home) return;

  let blocoBackup = pegar("backupHome");

  if (!blocoBackup) {
    blocoBackup = document.createElement("section");
    blocoBackup.id = "backupHome";
    blocoBackup.className = "panel glass-card backup-panel";

    blocoBackup.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>Sistema</h3>
          <p>Backup dos dados financeiros</p>
        </div>
      </div>

      <div class="backup-actions">
        <button type="button" onclick="exportarBackup()">Exportar backup</button>
        <button type="button" onclick="abrirImportarBackup()">Importar backup</button>
      </div>

      <input
        type="file"
        id="inputImportarBackup"
        accept="application/json,.json"
        style="display:none"
        onchange="importarBackupArquivo(event)"
      >
    `;

    home.appendChild(blocoBackup);
  }
}

function exportarBackup() {
  const dadosBackup = {
    app: "Missao Financeira V2",
    usuario: "Dener",
    exportadoEm: new Date().toISOString(),
    entradas,
    saidas,
    contas,
    metas
  };

  const conteudo = JSON.stringify(dadosBackup, null, 2);
  const arquivo = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = `backup-missao-financeira-${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function abrirImportarBackup() {
  const input = pegar("inputImportarBackup");
  if (!input) return;

  input.value = "";
  input.click();
}

function importarBackupArquivo(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = async function(e) {
    try {
      const dados = JSON.parse(e.target.result);

      if (
        !dados ||
        !Array.isArray(dados.entradas) ||
        !Array.isArray(dados.saidas) ||
        !Array.isArray(dados.contas) ||
        !Array.isArray(dados.metas)
      ) {
        alert("Backup inválido.");
        return;
      }

      if (!confirm("Importar este backup? Isso substituirá os dados atuais.")) return;

      entradas = dados.entradas;
      saidas = dados.saidas;
      contas = dados.contas;
      metas = dados.metas;

      await salvarDados();
      atualizarTela();

      alert("Backup importado.");
    } catch (erro) {
      alert("Erro ao importar backup.");
    }
  };

  leitor.readAsText(arquivo);
}

/* =========================
   MODAIS
========================= */

function criarModalEditarConta() {
  if (pegar("modalEditarConta")) return;

  const modal = document.createElement("div");
  modal.id = "modalEditarConta";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card glass-card">
      <div class="modal-head">
        <div>
          <span>MISSION_EDIT</span>
          <h3>Editar conta</h3>
        </div>
        <button type="button" class="modal-close" onclick="fecharModalEditarConta()">×</button>
      </div>

      <div class="modal-form">
        <label>Nome da conta <input id="editarContaNome" type="text"></label>
        <label>Valor <input id="editarContaValor" type="number" step="0.01"></label>
        <label>Vencimento <input id="editarContaVencimento" type="date"></label>

        <label>
          Categoria
          <select id="editarContaCategoria">
            <option value="Streaming">Streaming</option>
            <option value="Internet">Internet</option>
            <option value="Apps">Apps</option>
            <option value="Pessoa">Pessoa</option>
            <option value="Serviço">Serviço</option>
            <option value="Moradia">Moradia</option>
            <option value="Outro">Outro</option>
          </select>
        </label>

        <label>
          Status
          <select id="editarContaStatus" onchange="alternarCampoDataPagamento()">
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
          </select>
        </label>

        <label id="campoDataPagamento" class="hidden">
          Data de pagamento
          <input id="editarContaPagaEm" type="text" placeholder="DD/MM/AAAA">
        </label>
      </div>

      <div class="modal-actions">
        <button type="button" class="modal-save" onclick="salvarEdicaoConta()">Salvar alterações</button>
        <button type="button" class="modal-cancel" onclick="fecharModalEditarConta()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function abrirModalEditarConta(index) {
  criarModalEditarConta();

  const conta = contas[index];
  if (!conta) return;

  contaEditandoIndex = index;

  escreverValor("editarContaNome", conta.nome || "");
  escreverValor("editarContaValor", conta.valor || "");
  escreverValor("editarContaVencimento", conta.vencimento || "");
  escreverValor("editarContaCategoria", conta.categoria || "Outro");
  escreverValor("editarContaStatus", conta.status || "pendente");
  escreverValor("editarContaPagaEm", conta.pagaEm || hojeBR());

  alternarCampoDataPagamento();

  pegar("modalEditarConta")?.classList.add("active");
}

function fecharModalEditarConta() {
  pegar("modalEditarConta")?.classList.remove("active");
  contaEditandoIndex = null;
}

function alternarCampoDataPagamento() {
  const status = pegar("editarContaStatus")?.value;
  const campo = pegar("campoDataPagamento");

  if (!campo) return;

  if (status === "paga") {
    campo.classList.remove("hidden");

    const input = pegar("editarContaPagaEm");
    if (input && !input.value) input.value = hojeBR();
  } else {
    campo.classList.add("hidden");
  }
}

async function salvarEdicaoConta() {
  if (contaEditandoIndex === null) return;

  const conta = contas[contaEditandoIndex];
  if (!conta) return;

  const nome = pegar("editarContaNome")?.value.trim();
  const valor = Number(pegar("editarContaValor")?.value);
  const vencimento = pegar("editarContaVencimento")?.value;
  const categoria = pegar("editarContaCategoria")?.value;
  const status = pegar("editarContaStatus")?.value;

  let pagaEm = null;

  if (!nome || valor <= 0 || !vencimento) {
    alert("Preencha nome, valor e vencimento.");
    return;
  }

  if (status === "paga") {
    pagaEm = pegar("editarContaPagaEm")?.value.trim();

    if (!validarDataBR(pagaEm)) {
      alert("Use a data no formato DD/MM/AAAA.");
      return;
    }
  }

  contas[contaEditandoIndex] = {
    ...conta,
    nome,
    valor,
    vencimento,
    categoria,
    status,
    pagaEm
  };

  await salvarDados();
  fecharModalEditarConta();
  atualizarTela();
}

function criarModalEditarMeta() {
  if (pegar("modalEditarMeta")) return;

  const modal = document.createElement("div");
  modal.id = "modalEditarMeta";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card glass-card">
      <div class="modal-head">
        <div>
          <span>MISSION_GOAL</span>
          <h3>Editar meta</h3>
        </div>
        <button type="button" class="modal-close" onclick="fecharModalEditarMeta()">×</button>
      </div>

      <div class="modal-form">
        <label>Nome da meta <input id="editarMetaNome" type="text"></label>
        <label>Valor total <input id="editarMetaValorTotal" type="number" step="0.01"></label>
        <label>Valor guardado <input id="editarMetaValorAtual" type="number" step="0.01"></label>
      </div>

      <div class="modal-actions">
        <button type="button" class="modal-save" onclick="salvarEdicaoMeta()">Salvar alterações</button>
        <button type="button" class="modal-cancel" onclick="fecharModalEditarMeta()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function abrirModalEditarMeta(id) {
  criarModalEditarMeta();

  const meta = metas.find((item) => item.id === id);
  if (!meta) return;

  metaEditandoId = id;

  escreverValor("editarMetaNome", meta.nome || "");
  escreverValor("editarMetaValorTotal", meta.valorTotal || "");
  escreverValor("editarMetaValorAtual", meta.valorAtual || 0);

  pegar("modalEditarMeta")?.classList.add("active");
}

function fecharModalEditarMeta() {
  pegar("modalEditarMeta")?.classList.remove("active");
  metaEditandoId = null;
}

async function salvarEdicaoMeta() {
  if (metaEditandoId === null) return;

  const meta = metas.find((item) => item.id === metaEditandoId);
  if (!meta) return;

  const nome = pegar("editarMetaNome")?.value.trim();
  const valorTotal = Number(pegar("editarMetaValorTotal")?.value);
  let valorAtual = Number(pegar("editarMetaValorAtual")?.value);

  if (!nome || valorTotal <= 0) {
    alert("Preencha o nome e o valor total.");
    return;
  }

  if (isNaN(valorAtual) || valorAtual < 0) {
    valorAtual = 0;
  }

  if (valorAtual > valorTotal) {
    valorAtual = valorTotal;
  }

  meta.nome = nome;
  meta.valorTotal = valorTotal;
  meta.valorAtual = valorAtual;

  await salvarDados();
  fecharModalEditarMeta();
  atualizarTela();
}

function criarModalEditarTransacao() {
  if (pegar("modalEditarTransacao")) return;

  const modal = document.createElement("div");
  modal.id = "modalEditarTransacao";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card glass-card">
      <div class="modal-head">
        <div>
          <span id="editarTransacaoLabel">MISSION_FLOW</span>
          <h3 id="editarTransacaoTitulo">Editar registro</h3>
        </div>
        <button type="button" class="modal-close" onclick="fecharModalEditarTransacao()">×</button>
      </div>

      <div class="modal-form">
        <label>Nome <input id="editarTransacaoNome" type="text"></label>
        <label>Valor <input id="editarTransacaoValor" type="number" step="0.01"></label>
        <label>Data <input id="editarTransacaoData" type="text" placeholder="DD/MM/AAAA"></label>
      </div>

      <div class="modal-actions">
        <button type="button" class="modal-save" onclick="salvarEdicaoTransacao()">Salvar alterações</button>
        <button type="button" class="modal-cancel" onclick="fecharModalEditarTransacao()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function abrirModalEditarTransacao(tipo, id) {
  criarModalEditarTransacao();

  const lista = tipo === "entrada" ? entradas : saidas;
  const item = lista.find((registro) => registro.id === id);

  if (!item) return;

  transacaoEditandoTipo = tipo;
  transacaoEditandoId = id;

  escrever("editarTransacaoTitulo", tipo === "entrada" ? "Editar ganho" : "Editar saída");
  escrever("editarTransacaoLabel", tipo === "entrada" ? "MISSION_INCOME" : "MISSION_OUTFLOW");

  escreverValor("editarTransacaoNome", item.nome || "");
  escreverValor("editarTransacaoValor", item.valor || "");
  escreverValor("editarTransacaoData", item.data || hojeBR());

  pegar("modalEditarTransacao")?.classList.add("active");
}

function fecharModalEditarTransacao() {
  pegar("modalEditarTransacao")?.classList.remove("active");

  transacaoEditandoTipo = null;
  transacaoEditandoId = null;
}

async function salvarEdicaoTransacao() {
  if (!transacaoEditandoTipo || transacaoEditandoId === null) return;

  const lista = transacaoEditandoTipo === "entrada" ? entradas : saidas;
  const item = lista.find((registro) => registro.id === transacaoEditandoId);

  if (!item) return;

  const nome = pegar("editarTransacaoNome")?.value.trim();
  const valor = Number(pegar("editarTransacaoValor")?.value);
  const data = pegar("editarTransacaoData")?.value.trim();

  if (!nome || valor <= 0) {
    alert("Preencha o nome e um valor válido.");
    return;
  }

  if (!validarDataBR(data)) {
    alert("Use a data no formato DD/MM/AAAA.");
    return;
  }

  item.nome = nome;
  item.valor = valor;
  item.data = data;

  await salvarDados();
  fecharModalEditarTransacao();
  atualizarTela();
}

/* =========================
   RENDER
========================= */

function atualizarTela() {
  try {
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
    criarAreaBackupNaHome();
  } catch (erro) {
    console.error("Erro ao atualizar tela:", erro);
  }
}

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

  escrever(
    "resumoGanhosTela",
    moeda(filtradas.reduce((soma, item) => soma + numero(item.valor), 0))
  );

  if (!filtradas.length) {
    lista.innerHTML = `<p class="empty">Nenhum ganho encontrado neste período.</p>`;
    return;
  }

  lista.innerHTML = filtradas.map((item) => `
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
          <button type="button" onclick="editarEntrada(${item.id})">✎</button>
          <button type="button" onclick="excluirEntrada(${item.id})">×</button>
        </div>
      </div>
    </div>
  `).join("");
}

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

  escrever(
    "resumoSaidasTela",
    moeda(filtradas.reduce((soma, item) => soma + numero(item.valor), 0))
  );

  if (!filtradas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma saída encontrada neste período.</p>`;
    return;
  }

  lista.innerHTML = filtradas.map((item) => `
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
          <button type="button" onclick="editarSaida(${item.id})">✎</button>
          <button type="button" onclick="excluirSaida(${item.id})">×</button>
        </div>
      </div>
    </div>
  `).join("");
}

function criarHtmlConta(conta, comAcoes = true) {
  const estaPaga = conta.status === "paga";
  const diasParaVencer = calcularDias(conta.vencimento);
  const estaAtrasada = !estaPaga && diasParaVencer < 0;
  const estaEmAlerta = !estaPaga && diasParaVencer >= 0 && diasParaVencer <= 3;

  return `
    <div class="item conta-item ${estaPaga ? "conta-paga" : ""} ${estaAtrasada ? "agenda-atrasada" : ""} ${estaEmAlerta ? "conta-alerta" : ""}">
      <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

      <div>
        <h4>${conta.nome}</h4>
        <small>${comAcoes ? `${conta.categoria} • ` : ""}${textoDias(conta.vencimento, estaPaga, conta.pagaEm)}</small>
      </div>

      <div>
        <strong>${moeda(conta.valor)}</strong>

        ${
          comAcoes
            ? `
              <div class="item-actions">
                <button type="button" onclick="marcarContaPaga(${conta.indexOriginal})">${estaPaga ? "↺" : "✓"}</button>
                <button type="button" onclick="editarConta(${conta.indexOriginal})">✎</button>
                <button type="button" onclick="excluirConta(${conta.indexOriginal})">×</button>
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;
}

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

  lista.innerHTML = contasFiltradas.map((conta) => criarHtmlConta(conta, true)).join("");
}

function criarCardMeta(meta) {
  const progresso = meta.valorTotal > 0
    ? Math.min((numero(meta.valorAtual) / numero(meta.valorTotal)) * 100, 100)
    : 0;

  const porcentagem = Math.round(progresso);
  const falta = Math.max(numero(meta.valorTotal) - numero(meta.valorAtual), 0);
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
        ${concluida ? "" : `<button type="button" onclick="adicionarValorMeta(${meta.id})">Adicionar valor</button>`}
        <button type="button" onclick="editarMeta(${meta.id})">Editar</button>
        <button type="button" onclick="excluirMeta(${meta.id})">Excluir</button>
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
      ? (numero(meta.valorAtual) / numero(meta.valorTotal)) * 100
      : 0;

    return progresso < 100;
  });

  const metasConcluidas = metas.filter((meta) => {
    const progresso = meta.valorTotal > 0
      ? (numero(meta.valorAtual) / numero(meta.valorTotal)) * 100
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

function montarGrupoAgenda(titulo, listaDeContas) {
  if (!listaDeContas.length) return "";

  return `
    <div class="agenda-group">
      <h3>${titulo}</h3>
      <div class="list">
        ${listaDeContas.map((conta) => criarHtmlConta(conta, false)).join("")}
      </div>
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

  lista.innerHTML =
    montarGrupoAgenda("Atrasadas", atrasadas) +
    montarGrupoAgenda("Vence hoje", hoje) +
    montarGrupoAgenda("Próximos 7 dias", proximos7Dias) +
    montarGrupoAgenda("Este mês", esteMes) +
    montarGrupoAgenda("Pagas", pagas);
}

function atualizarHome() {
  const proximos = pegar("listaProximosVencimentos");
  const metaDestaque = pegar("metaDestaque");

  if (proximos) {
    const contasPendentes = contas
      .filter((conta) => conta.status !== "paga")
      .map((conta, indexOriginal) => ({
        ...conta,
        indexOriginal
      }))
      .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
      .slice(0, 3);

    if (!contasPendentes.length) {
      proximos.innerHTML = `<p class="empty">Nenhum vencimento pendente.</p>`;
    } else {
      proximos.innerHTML = contasPendentes.map((conta) => criarHtmlConta(conta, false)).join("");
    }
  }

  if (metaDestaque) {
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
}

/* =========================
   SPLASH DESLIGADA
========================= */

function iniciarSplashV2() {
  const splash = pegar("splashScreen") || document.querySelector(".splash-screen");

  if (splash) {
    splash.classList.add("hide");
    splash.style.display = "none";
    splash.style.opacity = "0";
    splash.style.visibility = "hidden";
    splash.style.pointerEvents = "none";
  }
}

/* =========================
   EXPORTAR FUNÇÕES
========================= */

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

window.adicionarValorMeta = adicionarValorMeta;
window.editarMeta = editarMeta;
window.excluirMeta = excluirMeta;

window.apagarTudo = apagarTudo;

window.aplicarFiltroContas = aplicarFiltroContas;
window.aplicarFiltroEntradas = aplicarFiltroEntradas;
window.aplicarFiltroSaidas = aplicarFiltroSaidas;

window.exportarBackup = exportarBackup;
window.abrirImportarBackup = abrirImportarBackup;
window.importarBackupArquivo = importarBackupArquivo;

window.mudarMesResumo = mudarMesResumo;

window.abrirModalEditarConta = abrirModalEditarConta;
window.fecharModalEditarConta = fecharModalEditarConta;
window.salvarEdicaoConta = salvarEdicaoConta;
window.alternarCampoDataPagamento = alternarCampoDataPagamento;

window.abrirModalEditarMeta = abrirModalEditarMeta;
window.fecharModalEditarMeta = fecharModalEditarMeta;
window.salvarEdicaoMeta = salvarEdicaoMeta;

window.abrirModalEditarTransacao = abrirModalEditarTransacao;
window.fecharModalEditarTransacao = fecharModalEditarTransacao;
window.salvarEdicaoTransacao = salvarEdicaoTransacao;

/* =========================
   INICIAR
========================= */

document.addEventListener("DOMContentLoaded", () => {
  iniciarSplashV2();
  carregarDados();
});
