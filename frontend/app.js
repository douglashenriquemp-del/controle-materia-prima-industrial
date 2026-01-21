const API_URL = "http://localhost:8000";

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
  elements.exportCsv.href = `${API_URL}/export/purchase-suggestions.csv?dias=${dias}`;
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
