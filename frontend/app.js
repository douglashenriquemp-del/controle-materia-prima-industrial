const API_URL = "http://localhost:8000";
const MOCK_MODE = new URLSearchParams(window.location.search).get("mock") === "true";

const mockState = {
  items: [
    {
      id: 1,
      sku: "ACO-001",
      descricao: "Bobina de Aço Carbono",
      unidade: "kg",
      categoria: "Metais",
      estoque_atual: 1200,
      estoque_minimo: 500,
      estoque_seguranca: 300,
      lead_time_dias: 10,
      consumo_medio_diario: 40,
      ponto_pedido: 700,
      status: "OK",
    },
    {
      id: 2,
      sku: "POL-010",
      descricao: "Polímero ABS",
      unidade: "kg",
      categoria: "Polímeros",
      estoque_atual: 180,
      estoque_minimo: 300,
      estoque_seguranca: 200,
      lead_time_dias: 7,
      consumo_medio_diario: 35,
      ponto_pedido: 445,
      status: "CRITICO",
    },
    {
      id: 3,
      sku: "SOL-100",
      descricao: "Solvente Industrial",
      unidade: "L",
      categoria: "Químicos",
      estoque_atual: 140,
      estoque_minimo: 80,
      estoque_seguranca: 50,
      lead_time_dias: 5,
      consumo_medio_diario: 12,
      ponto_pedido: 110,
      status: "ATENCAO",
    },
  ],
  movements: [],
};

function updateMockStatus(item) {
  const pontoPedido =
    Number(item.consumo_medio_diario) * Number(item.lead_time_dias) +
    Number(item.estoque_seguranca);
  item.ponto_pedido = pontoPedido;
  if (Number(item.estoque_atual) <= Number(item.estoque_seguranca)) {
    item.status = "CRITICO";
  } else if (Number(item.estoque_atual) <= pontoPedido) {
    item.status = "ATENCAO";
  } else {
    item.status = "OK";
  }
}

function buildMockDashboard() {
  mockState.items.forEach(updateMockStatus);
  const itensAtencao = mockState.items.filter((item) => item.status === "ATENCAO").length;
  const itensCriticos = mockState.items.filter((item) => item.status === "CRITICO").length;
  return {
    total_itens: mockState.items.length,
    itens_atencao: itensAtencao,
    itens_criticos: itensCriticos,
    itens: mockState.items,
  };
}

async function mockFetchJson(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const path = url.replace(API_URL, "");
  const [pathname, queryString] = path.split("?");
  const query = new URLSearchParams(queryString || "");

  if (pathname.startsWith("/dashboard")) {
    return buildMockDashboard();
  }
  if (pathname.startsWith("/items") && method === "GET") {
    const search = query.get("search");
    const status = query.get("status");
    const categoria = query.get("categoria");
    let items = [...mockState.items];
    if (search) {
      const term = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.sku.toLowerCase().includes(term) ||
          item.descricao.toLowerCase().includes(term)
      );
    }
    if (categoria) {
      items = items.filter((item) => item.categoria === categoria);
    }
    items.forEach(updateMockStatus);
    if (status) {
      items = items.filter((item) => item.status === status);
    }
    return items;
  }
  if (pathname.startsWith("/items") && method === "POST") {
    const payload = JSON.parse(options.body);
    const newItem = {
      ...payload,
      id: mockState.items.length + 1,
      ponto_pedido: 0,
      status: "OK",
    };
    updateMockStatus(newItem);
    mockState.items.push(newItem);
    return newItem;
  }
  if (pathname.startsWith("/items/") && method === "PUT") {
    const itemId = Number(path.split("/")[2]);
    const payload = JSON.parse(options.body);
    const item = mockState.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error("Item não encontrado.");
    }
    Object.assign(item, payload);
    updateMockStatus(item);
    return item;
  }
  if (pathname.startsWith("/items/") && method === "DELETE") {
    const itemId = Number(path.split("/")[2]);
    const index = mockState.items.findIndex((entry) => entry.id === itemId);
    if (index === -1) {
      throw new Error("Item não encontrado.");
    }
    mockState.items.splice(index, 1);
    return { message: "Item excluído com sucesso." };
  }
  if (pathname.startsWith("/movements") && method === "POST") {
    const payload = JSON.parse(options.body);
    const item = mockState.items.find((entry) => entry.id === payload.item_id);
    if (!item) {
      throw new Error("Item não encontrado.");
    }
    const quantidade = Number(payload.quantidade);
    if (payload.tipo === "SAIDA" && item.estoque_atual - quantidade < 0) {
      throw new Error("Estoque não pode ficar negativo.");
    }
    if (payload.tipo === "ENTRADA") {
      item.estoque_atual += quantidade;
    } else if (payload.tipo === "SAIDA") {
      item.estoque_atual -= quantidade;
    } else if (payload.tipo === "AJUSTE_RELATIVO") {
      item.estoque_atual += quantidade;
    } else if (payload.tipo === "AJUSTE_ABSOLUTO") {
      item.estoque_atual = quantidade;
    }
    updateMockStatus(item);
    mockState.movements.push({ id: mockState.movements.length + 1, ...payload });
    return payload;
  }
  if (pathname.startsWith("/purchase-suggestions")) {
    const dias = Number(query.get("dias")) || 30;
    const sugestoes = mockState.items.map((item) => {
      const quantidade =
        Number(item.consumo_medio_diario) * dias - Number(item.estoque_atual);
      return {
        id: item.id,
        sku: item.sku,
        descricao: item.descricao,
        unidade: item.unidade,
        categoria: item.categoria,
        estoque_atual: item.estoque_atual,
        consumo_medio_diario: item.consumo_medio_diario,
        dias_cobertura: dias,
        quantidade_sugerida: Math.max(0, quantidade),
      };
    });
    return { dias_cobertura: dias, sugestoes };
  }

  throw new Error("Rota mock não implementada.");
}

const elements = {
  messages: document.getElementById("messages"),
  totalItens: document.getElementById("total-itens"),
  itensAtencao: document.getElementById("itens-atencao"),
  itensCriticos: document.getElementById("itens-criticos"),
  itemsTable: document.getElementById("items-table"),
  itemForm: document.getElementById("item-form"),
  itemId: document.getElementById("item-id"),
  sku: document.getElementById("sku"),
  descricao: document.getElementById("descricao"),
  unidade: document.getElementById("unidade"),
  categoria: document.getElementById("categoria"),
  estoqueAtual: document.getElementById("estoque_atual"),
  estoqueMinimo: document.getElementById("estoque_minimo"),
  estoqueSeguranca: document.getElementById("estoque_seguranca"),
  leadTime: document.getElementById("lead_time_dias"),
  consumoMedio: document.getElementById("consumo_medio_diario"),
  resetItem: document.getElementById("reset-item"),
  search: document.getElementById("search"),
  filterStatus: document.getElementById("filter-status"),
  filterCategoria: document.getElementById("filter-categoria"),
  applyFilter: document.getElementById("apply-filter"),
  movementForm: document.getElementById("movement-form"),
  movementItem: document.getElementById("movement-item"),
  movementType: document.getElementById("movement-type"),
  movementQuantidade: document.getElementById("movement-quantidade"),
  movementResponsavel: document.getElementById("movement-responsavel"),
  movementObservacao: document.getElementById("movement-observacao"),
  diasCobertura: document.getElementById("dias-cobertura"),
  loadSuggestions: document.getElementById("load-suggestions"),
  suggestionsTable: document.getElementById("suggestions-table"),
  exportCsv: document.getElementById("export-csv"),
};

function showMessage(text, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert ${type}`;
  alert.textContent = text;
  elements.messages.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "0";
  }
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function fetchJson(url, options) {
  if (MOCK_MODE) {
    return mockFetchJson(url, options);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Erro ao processar a solicitação.");
  }
  return response.json();
}

function resetItemForm() {
  elements.itemId.value = "";
  elements.itemForm.reset();
  elements.unidade.value = "kg";
}

function populateItemForm(item) {
  elements.itemId.value = item.id;
  elements.sku.value = item.sku;
  elements.descricao.value = item.descricao;
  elements.unidade.value = item.unidade;
  elements.categoria.value = item.categoria || "";
  elements.estoqueAtual.value = item.estoque_atual;
  elements.estoqueMinimo.value = item.estoque_minimo;
  elements.estoqueSeguranca.value = item.estoque_seguranca;
  elements.leadTime.value = item.lead_time_dias;
  elements.consumoMedio.value = item.consumo_medio_diario;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMovementItems(items) {
  elements.movementItem.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.sku} - ${item.descricao}`;
    elements.movementItem.appendChild(option);
  });
}

function renderItemsTable(items) {
  elements.itemsTable.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.descricao}</td>
      <td>${formatNumber(item.estoque_atual)} ${item.unidade}</td>
      <td>${formatNumber(item.ponto_pedido)}</td>
      <td>${formatNumber(item.estoque_seguranca)}</td>
      <td class="status ${item.status}">${item.status}</td>
      <td>
        <button data-action="edit" data-id="${item.id}">Editar</button>
        <button data-action="delete" data-id="${item.id}">Excluir</button>
      </td>
    `;
    elements.itemsTable.appendChild(row);
  });
}

function renderSuggestionsTable(items) {
  elements.suggestionsTable.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.descricao}</td>
      <td>${formatNumber(item.estoque_atual)}</td>
      <td>${formatNumber(item.consumo_medio_diario)}</td>
      <td>${formatNumber(item.quantidade_sugerida)} ${item.unidade}</td>
    `;
    elements.suggestionsTable.appendChild(row);
  });
}

async function loadDashboard() {
  const dashboard = await fetchJson(`${API_URL}/dashboard`);
  elements.totalItens.textContent = dashboard.total_itens;
  elements.itensAtencao.textContent = dashboard.itens_atencao;
  elements.itensCriticos.textContent = dashboard.itens_criticos;
  renderItemsTable(dashboard.itens);
  setMovementItems(dashboard.itens);
}

async function applyFilters() {
  const params = new URLSearchParams();
  if (elements.search.value) {
    params.set("search", elements.search.value);
  }
  if (elements.filterStatus.value) {
    params.set("status", elements.filterStatus.value);
  }
  if (elements.filterCategoria.value) {
    params.set("categoria", elements.filterCategoria.value);
  }
  const items = await fetchJson(`${API_URL}/items?${params.toString()}`);
  renderItemsTable(items);
  setMovementItems(items);
}

async function submitItemForm(event) {
  event.preventDefault();
  const payload = {
    sku: elements.sku.value.trim(),
    descricao: elements.descricao.value.trim(),
    unidade: elements.unidade.value,
    categoria: elements.categoria.value.trim() || null,
    estoque_atual: Number(elements.estoqueAtual.value),
    estoque_minimo: Number(elements.estoqueMinimo.value),
    estoque_seguranca: Number(elements.estoqueSeguranca.value),
    lead_time_dias: Number(elements.leadTime.value),
    consumo_medio_diario: Number(elements.consumoMedio.value),
  };

  const itemId = elements.itemId.value;
  try {
    if (itemId) {
      await fetchJson(`${API_URL}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showMessage("Item atualizado com sucesso.");
    } else {
      await fetchJson(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showMessage("Item cadastrado com sucesso.");
    }
    resetItemForm();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function handleTableClick(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) {
    return;
  }
  if (action === "edit") {
    const items = await fetchJson(`${API_URL}/items`);
    const item = items.find((entry) => String(entry.id) === id);
    if (item) {
      populateItemForm(item);
    }
    return;
  }
  if (action === "delete") {
    const confirmed = window.confirm("Deseja realmente excluir este item?");
    if (!confirmed) {
      return;
    }
    try {
      await fetchJson(`${API_URL}/items/${id}`, { method: "DELETE" });
      showMessage("Item excluído com sucesso.");
      await loadDashboard();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
}

async function submitMovementForm(event) {
  event.preventDefault();
  const payload = {
    item_id: Number(elements.movementItem.value),
    tipo: elements.movementType.value,
    quantidade: Number(elements.movementQuantidade.value),
    responsavel: elements.movementResponsavel.value.trim() || null,
    observacao: elements.movementObservacao.value.trim() || null,
  };
  try {
    await fetchJson(`${API_URL}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showMessage("Movimentação registrada com sucesso.");
    elements.movementForm.reset();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadSuggestions() {
  const dias = Number(elements.diasCobertura.value) || 30;
  const data = await fetchJson(`${API_URL}/purchase-suggestions?dias=${dias}`);
  renderSuggestionsTable(data.sugestoes);
  if (MOCK_MODE) {
    const headers = [
      "sku",
      "descricao",
      "unidade",
      "categoria",
      "estoque_atual",
      "consumo_medio_diario",
      "dias_cobertura",
      "quantidade_sugerida",
    ];
    const rows = data.sugestoes.map((item) =>
      [
        item.sku,
        item.descricao,
        item.unidade,
        item.categoria || "",
        item.estoque_atual,
        item.consumo_medio_diario,
        item.dias_cobertura,
        item.quantidade_sugerida,
      ].join(";")
    );
    const content = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    elements.exportCsv.href = url;
    elements.exportCsv.download = `sugestao-compras-${dias}-dias.csv`;
  } else {
    elements.exportCsv.href = `${API_URL}/export/purchase-suggestions.csv?dias=${dias}`;
  }
}

elements.itemForm.addEventListener("submit", submitItemForm);
elements.resetItem.addEventListener("click", resetItemForm);
elements.itemsTable.addEventListener("click", handleTableClick);
elements.applyFilter.addEventListener("click", applyFilters);
elements.movementForm.addEventListener("submit", submitMovementForm);
elements.loadSuggestions.addEventListener("click", loadSuggestions);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadDashboard();
    await loadSuggestions();
  } catch (error) {
    showMessage("Falha ao carregar dados iniciais.", "error");
  }
});
