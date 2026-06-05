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

let mesResumoSelecionado = new Date().getMonth();
let anoResumoSelecionado = new Date().getFullYear();

let contaEditandoIndex = null;
let metaEditandoId = null;

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

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
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

  return data.getMonth() === mes && data.getFullYear() === ano;
}

function contaPagaNoMes(conta, mes, ano) {
  if (conta.status !== "paga") return false;

  if (conta.pagaEm) {
    return dataBRNoMes(conta.pagaEm, mes, ano);
  }

  return vencimentoNoMes(conta.vencimento, mes, ano);
}

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

function calcularResumoMensal(mes = mesResumoSelecionado, ano = anoResumoSelecionado) {
  const entradasDoMes = entradas.filter((item) => dataBRNoMes(item.data, mes, ano));
  const saidasDoMes = saidas.filter((item) => dataBRNoMes(item.data, mes, ano));

  const contasPendentesDoMes = contas.filter((conta) => {
    return conta.status !== "paga" && vencimentoNoMes(conta.vencimento, mes, ano);
  });

  const contasPagasDoMes = contas.filter((conta) => {
    return contaPagaNoMes(conta, mes, ano);
  });

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
    saldoProjetado,
    mes,
    ano
  };
}

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
    status: "pendente",
    pagaEm: null
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

  contas.splice(index, 1);

  await salvarDados();
  atualizarTela();
}

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

function editarMeta(id) {
  abrirModalEditarMeta(id);
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

  const arquivo = new Blob([conteudo], {
    type: "application/json"
  });

  const url = URL.createObjectURL(arquivo);

  const link = document.createElement("a");
  link.href = url;

  const dataHoje = new Date().toISOString().slice(0, 10);
  link.download = `backup-missao-financeira-${dataHoje}.json`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function abrirImportarBackup() {
  const input = pegar("inputImportarBackup");

  if (!input) {
    alert("Campo de importação não encontrado.");
    return;
  }

  input.value = "";
  input.click();
}

function importarBackupArquivo(event) {
  const arquivo = event.target.files[0];

  if (!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = async function(e) {
    try {
      const conteudo = e.target.result;
      const dados = JSON.parse(conteudo);

      if (!dados || typeof dados !== "object") {
        alert("Arquivo de backup inválido.");
        return;
      }

      if (
        !Array.isArray(dados.entradas) ||
        !Array.isArray(dados.saidas) ||
        !Array.isArray(dados.contas) ||
        !Array.isArray(dados.metas)
      ) {
        alert("Esse arquivo não parece ser um backup válido do app.");
        return;
      }

      const confirmar = confirm(
        "Tem certeza que deseja importar este backup? Isso substituirá os dados atuais do app."
      );

      if (!confirmar) return;

      entradas = dados.entradas;
      saidas = dados.saidas;
      contas = dados.contas;
      metas = dados.metas;

      await salvarDados();
      atualizarTela();

      alert("Backup importado com sucesso.");
    } catch (erro) {
      console.error("Erro ao importar backup:", erro);
      alert("Erro ao importar backup. Verifique se o arquivo é um JSON válido.");
    }
  };

  leitor.readAsText(arquivo);
}

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
        <label>
          Nome da conta
          <input id="editarContaNome" type="text" placeholder="Nome da conta">
        </label>

        <label>
          Valor
          <input id="editarContaValor" type="number" step="0.01" placeholder="Valor da conta">
        </label>

        <label>
          Vencimento
          <input id="editarContaVencimento" type="date">
        </label>

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

  pegar("editarContaNome").value = conta.nome || "";
  pegar("editarContaValor").value = conta.valor || "";
  pegar("editarContaVencimento").value = conta.vencimento || "";
  pegar("editarContaCategoria").value = conta.categoria || "Outro";
  pegar("editarContaStatus").value = conta.status || "pendente";
  pegar("editarContaPagaEm").value = conta.pagaEm || hojeBR();

  alternarCampoDataPagamento();

  pegar("modalEditarConta").classList.add("active");
}

function fecharModalEditarConta() {
  const modal = pegar("modalEditarConta");

  if (modal) {
    modal.classList.remove("active");
  }

  contaEditandoIndex = null;
}

function alternarCampoDataPagamento() {
  const status = pegar("editarContaStatus")?.value;
  const campo = pegar("campoDataPagamento");

  if (!campo) return;

  if (status === "paga") {
    campo.classList.remove("hidden");

    if (!pegar("editarContaPagaEm").value) {
      pegar("editarContaPagaEm").value = hojeBR();
    }
  } else {
    campo.classList.add("hidden");
  }
}

async function salvarEdicaoConta() {
  if (contaEditandoIndex === null) return;

  const conta = contas[contaEditandoIndex];

  if (!conta) return;

  const nome = pegar("editarContaNome").value.trim();
  const valor = Number(pegar("editarContaValor").value);
  const vencimento = pegar("editarContaVencimento").value;
  const categoria = pegar("editarContaCategoria").value;
  const status = pegar("editarContaStatus").value;
  let pagaEm = null;

  if (!nome || valor <= 0 || !vencimento) {
    alert("Preencha nome, valor e vencimento.");
    return;
  }

  if (status === "paga") {
    pagaEm = pegar("editarContaPagaEm").value.trim();

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(pagaEm)) {
      alert("Use a data de pagamento no formato DD/MM/AAAA. Exemplo: 04/06/2026");
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
        <label>
          Nome da meta
          <input id="editarMetaNome" type="text" placeholder="Nome da meta">
        </label>

        <label>
          Valor total da meta
          <input id="editarMetaValorTotal" type="number" step="0.01" placeholder="Valor total">
        </label>

        <label>
          Valor já guardado
          <input id="editarMetaValorAtual" type="number" step="0.01" placeholder="Valor guardado">
        </label>
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

  pegar("editarMetaNome").value = meta.nome || "";
  pegar("editarMetaValorTotal").value = meta.valorTotal || "";
  pegar("editarMetaValorAtual").value = meta.valorAtual || 0;

  pegar("modalEditarMeta").classList.add("active");
}

function fecharModalEditarMeta() {
  const modal = pegar("modalEditarMeta");

  if (modal) {
    modal.classList.remove("active");
  }

  metaEditandoId = null;
}

async function salvarEdicaoMeta() {
  if (metaEditandoId === null) return;

  const meta = metas.find((item) => item.id === metaEditandoId);
  if (!meta) return;

  const nome = pegar("editarMetaNome").value.trim();
  const valorTotal = Number(pegar("editarMetaValorTotal").value);
  let valorAtual = Number(pegar("editarMetaValorAtual").value);

  if (!nome || valorTotal <= 0) {
    alert("Preencha o nome da meta e o valor total.");
    return;
  }

  if (isNaN(valorAtual) || valorAtual < 0) {
    alert("Digite um valor guardado válido.");
    return;
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
  criarAreaBackupNaHome();
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
      const diasParaVencer = calcularDias(conta.vencimento);
      const estaAtrasada = !estaPaga && diasParaVencer < 0;
      const estaEmAlerta = !estaPaga && diasParaVencer >= 0 && diasParaVencer <= 3;

      return `
        <div class="item conta-item ${estaPaga ? "conta-paga" : ""} ${estaAtrasada ? "agenda-atrasada" : ""} ${estaEmAlerta ? "conta-alerta" : ""}">
          <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

          <div>
            <h4>${conta.nome}</h4>
            <small>${conta.categoria} • ${textoDias(conta.vencimento, estaPaga, conta.pagaEm)}</small>
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

function montarGrupoAgenda(titulo, listaDeContas) {
  if (!listaDeContas.length) return "";

  const itens = listaDeContas.map((conta) => {
    const estaPaga = conta.status === "paga";
    const diasParaVencer = calcularDias(conta.vencimento);
    const estaAtrasada = !estaPaga && diasParaVencer < 0;
    const estaEmAlerta = !estaPaga && diasParaVencer >= 0 && diasParaVencer <= 3;

    return `
      <div class="item conta-item ${estaPaga ? "conta-paga" : ""} ${estaAtrasada ? "agenda-atrasada" : ""} ${estaEmAlerta ? "conta-alerta" : ""}">
        <div class="item-icon">${iconeConta(conta.nome, conta.categoria)}</div>

        <div>
          <h4>${conta.nome}</h4>
          <small>${textoDias(conta.vencimento, estaPaga, conta.pagaEm)}</small>
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
      const diasParaVencer = calcularDias(conta.vencimento);
      const estaAtrasada = diasParaVencer < 0;
      const estaEmAlerta = diasParaVencer >= 0 && diasParaVencer <= 3;

      return `
        <div class="item conta-item ${estaAtrasada ? "agenda-atrasada" : ""} ${estaEmAlerta ? "conta-alerta" : ""}">
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

document.addEventListener("DOMContentLoaded", () => {
  iniciarSplashV2();
  carregarDados();
});

/* =====================================================
   EDITAR GANHO / SAÍDA — MODAL PREMIUM
   Substitui prompt nativo por modal visual
   ===================================================== */

let transacaoEditandoPremiumTipo = null;
let transacaoEditandoPremiumId = null;

function criarModalEditarTransacaoPremium() {
  if (document.getElementById("modalEditarTransacaoPremium")) return;

  const modal = document.createElement("div");
  modal.id = "modalEditarTransacaoPremium";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <span id="editarTransacaoPremiumLabel">MISSION_FLOW</span>
          <h3 id="editarTransacaoPremiumTitulo">Editar registro</h3>
        </div>

        <button type="button" class="modal-close" onclick="fecharModalEditarTransacaoPremium()">×</button>
      </div>

      <div class="modal-form">
        <label>
          Nome
          <input id="editarTransacaoPremiumNome" type="text" placeholder="Nome do registro">
        </label>

        <label>
          Valor
          <input id="editarTransacaoPremiumValor" type="number" step="0.01" placeholder="Valor">
        </label>

        <label>
          Data
          <input id="editarTransacaoPremiumData" type="text" placeholder="DD/MM/AAAA">
        </label>
      </div>

      <div class="modal-actions">
        <button type="button" class="modal-save" onclick="salvarEditarTransacaoPremium()">Salvar alterações</button>
        <button type="button" class="modal-cancel" onclick="fecharModalEditarTransacaoPremium()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function abrirModalEditarTransacaoPremium(tipo, id) {
  criarModalEditarTransacaoPremium();

  const lista = tipo === "entrada" ? entradas : saidas;
  const item = lista.find((registro) => registro.id === id);

  if (!item) {
    alert("Registro não encontrado.");
    return;
  }

  transacaoEditandoPremiumTipo = tipo;
  transacaoEditandoPremiumId = id;

  const titulo = tipo === "entrada" ? "Editar ganho" : "Editar saída";
  const label = tipo === "entrada" ? "MISSION_INCOME" : "MISSION_OUTFLOW";

  document.getElementById("editarTransacaoPremiumTitulo").textContent = titulo;
  document.getElementById("editarTransacaoPremiumLabel").textContent = label;

  document.getElementById("editarTransacaoPremiumNome").value = item.nome || "";
  document.getElementById("editarTransacaoPremiumValor").value = item.valor || "";
  document.getElementById("editarTransacaoPremiumData").value = item.data || new Date().toLocaleDateString("pt-BR");

  document.getElementById("modalEditarTransacaoPremium").classList.add("active");
}

function fecharModalEditarTransacaoPremium() {
  const modal = document.getElementById("modalEditarTransacaoPremium");

  if (modal) {
    modal.classList.remove("active");
  }

  transacaoEditandoPremiumTipo = null;
  transacaoEditandoPremiumId = null;
}

function validarDataTransacaoPremium(data) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(data);
}

async function salvarEditarTransacaoPremium() {
  if (!transacaoEditandoPremiumTipo || transacaoEditandoPremiumId === null) return;

  const lista = transacaoEditandoPremiumTipo === "entrada" ? entradas : saidas;
  const item = lista.find((registro) => registro.id === transacaoEditandoPremiumId);

  if (!item) {
    alert("Registro não encontrado.");
    return;
  }

  const nome = document.getElementById("editarTransacaoPremiumNome").value.trim();
  const valor = Number(document.getElementById("editarTransacaoPremiumValor").value);
  const data = document.getElementById("editarTransacaoPremiumData").value.trim();

  if (!nome || valor <= 0) {
    alert("Preencha o nome e um valor válido.");
    return;
  }

  if (!validarDataTransacaoPremium(data)) {
    alert("Use a data no formato DD/MM/AAAA.");
    return;
  }

  item.nome = nome;
  item.valor = valor;
  item.data = data;

  await salvarDados();

  fecharModalEditarTransacaoPremium();
  atualizarTela();
}

/* sobrescreve os editores antigos com prompt nativo */
window.editarEntrada = function(id) {
  abrirModalEditarTransacaoPremium("entrada", id);
};

window.editarSaida = function(id) {
  abrirModalEditarTransacaoPremium("saida", id);
};

window.fecharModalEditarTransacaoPremium = fecharModalEditarTransacaoPremium;
window.salvarEditarTransacaoPremium = salvarEditarTransacaoPremium;

/* =====================================================
   CENTRAL DE ALERTAS — HOME
   Mostra vencidas, vencendo hoje e próximas do vencimento
   ===================================================== */

function calcularDiasAlertaHome(vencimento) {
  if (!vencimento) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(vencimento + "T00:00:00");
  data.setHours(0, 0, 0, 0);

  if (isNaN(data.getTime())) return null;

  const diff = data - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarMoedaAlertaHome(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function textoPrazoAlertaHome(dias) {
  if (dias === null) return "Sem data definida";
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  return `Vence em ${dias} dias`;
}

function criarCentralAlertasHome() {
  const home = document.getElementById("home");
  if (!home) return;

  let bloco = document.getElementById("centralAlertasHome");

  if (!bloco) {
    bloco = document.createElement("section");
    bloco.id = "centralAlertasHome";
    bloco.className = "panel glass-card central-alertas-panel";

    const resumoMensal = document.getElementById("resumoMensalHome");
    const metricas = home.querySelector(".metrics-grid");

    if (resumoMensal) {
      home.insertBefore(bloco, resumoMensal);
    } else if (metricas && metricas.nextSibling) {
      home.insertBefore(bloco, metricas.nextSibling);
    } else {
      home.appendChild(bloco);
    }
  }

  const contasPendentes = contas
    .filter((conta) => conta.status !== "paga")
    .map((conta) => ({
      ...conta,
      dias: calcularDiasAlertaHome(conta.vencimento)
    }))
    .filter((conta) => conta.dias !== null)
    .sort((a, b) => a.dias - b.dias);

  const atrasadas = contasPendentes.filter((conta) => conta.dias < 0);
  const vencemHoje = contasPendentes.filter((conta) => conta.dias === 0);
  const proximas = contasPendentes.filter((conta) => conta.dias > 0 && conta.dias <= 3);

  const alertasPrioritarios = [...atrasadas, ...vencemHoje, ...proximas];

  const totalUrgente = alertasPrioritarios.reduce((soma, conta) => soma + Number(conta.valor || 0), 0);

  const caixaAtualTexto = typeof calcularResumo === "function"
    ? calcularResumo().caixaAtual
    : 0;

  let statusMensagem = "";

  if (!alertasPrioritarios.length) {
    statusMensagem = "Nenhuma conta crítica no momento. Seu campo financeiro está sob controle.";
  } else if (caixaAtualTexto >= totalUrgente) {
    statusMensagem = "Seu caixa atual suporta os pagamentos urgentes. Priorize quitar o que vence primeiro.";
  } else {
    statusMensagem = "Atenção: seus alertas urgentes passam do caixa atual. Priorize o essencial.";
  }

  const cardsHtml = alertasPrioritarios.slice(0, 4).map((conta) => {
    let tipo = "proxima";

    if (conta.dias < 0) tipo = "atrasada";
    if (conta.dias === 0) tipo = "hoje";

    return `
      <div class="central-alerta-card ${tipo}">
        <div>
          <span>${textoPrazoAlertaHome(conta.dias)}</span>
          <strong>${conta.nome}</strong>
          <small>${conta.categoria || "Conta"} · ${formatarMoedaAlertaHome(conta.valor)}</small>
        </div>

        <div class="central-alerta-indicador">
          ${conta.dias < 0 ? "!" : conta.dias === 0 ? "0" : conta.dias}
        </div>
      </div>
    `;
  }).join("");

  bloco.innerHTML = `
    <div class="panel-head central-alertas-head">
      <div>
        <span>MISSION_ALERT</span>
        <h3>Central de Alertas</h3>
        <p>Leitura das contas que exigem atenção imediata</p>
      </div>

      <strong>${alertasPrioritarios.length}</strong>
    </div>

    <div class="central-alertas-resumo">
      <div>
        <span>Total urgente</span>
        <strong>${formatarMoedaAlertaHome(totalUrgente)}</strong>
      </div>

      <div>
        <span>Alertas ativos</span>
        <strong>${alertasPrioritarios.length}</strong>
      </div>
    </div>

    ${
      alertasPrioritarios.length
        ? `<div class="central-alertas-lista">${cardsHtml}</div>`
        : `<div class="central-alertas-vazio">Nenhum alerta crítico encontrado.</div>`
    }

    <div class="central-alertas-mensagem">
      ${statusMensagem}
    </div>
  `;
}

/* adiciona a central dentro do ciclo de atualização sem quebrar a função antiga */
if (typeof atualizarTela === "function" && !window.centralAlertasHomeAtivada) {
  const atualizarTelaOriginalCentralAlertas = atualizarTela;

  atualizarTela = function() {
    atualizarTelaOriginalCentralAlertas();
    criarCentralAlertasHome();
  };

  window.centralAlertasHomeAtivada = true;
}

/* =====================================================
   SOM DE INICIALIZAÇÃO — SPLASH
   Tenta tocar ao carregar e, no iPhone, toca no primeiro toque
   ===================================================== */

let somInicializacaoTocado = false;

function tocarSomInicializacao() {
  if (somInicializacaoTocado) return;

  const audio = new Audio("assets/startup.mp3");
  audio.volume = 0.35;

  const tentativa = audio.play();

  if (tentativa !== undefined) {
    tentativa
      .then(() => {
        somInicializacaoTocado = true;
      })
      .catch(() => {
        // iPhone/Safari pode bloquear autoplay.
        // Nesse caso, libera no primeiro toque do usuário.
        document.addEventListener(
          "touchstart",
          function tocarNoPrimeiroToque() {
            if (somInicializacaoTocado) return;

            audio.play()
              .then(() => {
                somInicializacaoTocado = true;
              })
              .catch(() => {});

            document.removeEventListener("touchstart", tocarNoPrimeiroToque);
          },
          { once: true }
        );

        document.addEventListener(
          "click",
          function tocarNoPrimeiroClick() {
            if (somInicializacaoTocado) return;

            audio.play()
              .then(() => {
                somInicializacaoTocado = true;
              })
              .catch(() => {});

            document.removeEventListener("click", tocarNoPrimeiroClick);
          },
          { once: true }
        );
      });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  tocarSomInicializacao();
});

/* =====================================================
   CENTRAL DE ALERTAS — HOME PREMIUM / CORREÇÃO VISUAL
   Cola no FINAL do script.js
   ===================================================== */

function mfCalcularDiasAlerta(vencimento) {
  if (!vencimento) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(vencimento + "T00:00:00");
  data.setHours(0, 0, 0, 0);

  if (isNaN(data.getTime())) return null;

  const diff = data - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function mfFormatarMoedaAlerta(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function mfTextoPrazoAlerta(dias) {
  if (dias === null) return "sem data";
  if (dias < 0) return `atrasada há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

function renderCentralAlertasHomePremium() {
  const home = document.getElementById("home");
  if (!home) return;

  let container = document.getElementById("centralAlertasHome");

  if (!container) {
    container = document.createElement("section");
    container.id = "centralAlertasHome";
    container.className = "panel glass-card central-alerts-panel";

    const resumoMensal = document.getElementById("resumoMensalHome");
    const metricas = home.querySelector(".metrics-grid");

    if (resumoMensal) {
      home.insertBefore(container, resumoMensal);
    } else if (metricas && metricas.nextSibling) {
      home.insertBefore(container, metricas.nextSibling);
    } else {
      home.appendChild(container);
    }
  }

  container.classList.remove("central-alertas-panel");
  container.classList.add("central-alerts-panel");

  const listaContas = Array.isArray(contas) ? contas : [];

  const contasPendentes = listaContas
    .filter((conta) => conta.status !== "paga")
    .map((conta) => ({
      ...conta,
      dias: mfCalcularDiasAlerta(conta.vencimento)
    }))
    .filter((conta) => conta.dias !== null)
    .sort((a, b) => a.dias - b.dias);

  const urgentes = contasPendentes.filter((conta) => conta.dias <= 7);

  const totalUrgente = urgentes.reduce((soma, conta) => {
    return soma + Number(conta.valor || 0);
  }, 0);

  const alertasAtivos = urgentes.length;

  let caixaAtual = 0;

  if (typeof calcularResumo === "function") {
    caixaAtual = Number(calcularResumo().caixaAtual || 0);
  } else {
    const totalEntradas = Array.isArray(entradas)
      ? entradas.reduce((soma, item) => soma + Number(item.valor || 0), 0)
      : 0;

    const totalSaidas = Array.isArray(saidas)
      ? saidas.reduce((soma, item) => soma + Number(item.valor || 0), 0)
      : 0;

    caixaAtual = totalEntradas - totalSaidas;
  }

  let suporteTexto = "";

  if (alertasAtivos === 0) {
    suporteTexto = "Nenhuma conta urgente no momento. Seu caixa está sob controle.";
  } else if (caixaAtual >= totalUrgente) {
    suporteTexto = "Seu caixa atual suporta os pagamentos urgentes. Priorize quitar o que vence primeiro.";
  } else {
    suporteTexto = "Seu caixa atual não cobre todos os pagamentos urgentes. Priorize o essencial primeiro.";
  }

  const listaHTML = urgentes.length
    ? urgentes.slice(0, 3).map((conta) => {
        return `
          <div class="central-alert-item">
            <div class="central-alert-item-left">
              <small>${mfTextoPrazoAlerta(conta.dias)}</small>
              <h4>${conta.nome || "Conta"}</h4>
              <p>${conta.categoria || "Conta"} · ${mfFormatarMoedaAlerta(conta.valor)}</p>
            </div>

            <div class="central-alert-item-value">
              ${mfFormatarMoedaAlerta(conta.valor)}
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="central-alert-empty">
        Nenhum alerta crítico no momento.
      </div>
    `;

  container.innerHTML = `
    <div class="central-alerts-header">
      <div>
        <span class="central-alerts-kicker">MISSION_ALERT</span>
        <h3>Central de Alertas</h3>
        <p>Leitura das contas que exigem atenção imediata</p>
      </div>

      <div class="central-alert-badge">${alertasAtivos}</div>
    </div>

    <div class="central-alert-summary">
      <div class="central-alert-summary-card">
        <span>Total urgente</span>
        <strong>${mfFormatarMoedaAlerta(totalUrgente)}</strong>
      </div>

      <div class="central-alert-summary-card">
        <span>Alertas ativos</span>
        <strong>${alertasAtivos}</strong>
      </div>
    </div>

    <div class="central-alert-list">
      ${listaHTML}
    </div>

    <div class="central-alert-support">
      <span>Suporte do caixa</span>
      <p>${suporteTexto}</p>
    </div>
  `;
}

/* chama a central junto com a atualização geral da tela */
if (typeof atualizarTela === "function" && !window.centralAlertasPremiumAtiva) {
  const atualizarTelaOriginalComAlertasPremium = atualizarTela;

  atualizarTela = function() {
    atualizarTelaOriginalComAlertasPremium();
    renderCentralAlertasHomePremium();
  };

  window.centralAlertasPremiumAtiva = true;
}

/* tentativa extra: renderiza quando a página já carregou */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    renderCentralAlertasHomePremium();
  }, 800);
});




