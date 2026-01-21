# Controle de Matéria-Prima Industrial

Aplicação web simples para controle de estoque de insumos e matérias-primas industriais, com cadastro de itens, movimentações, alertas e sugestões de compras.

## Requisitos

- Python 3.10+
- SQLite (já incluso no Python)

## Como rodar o backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python init_db.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

A API ficará disponível em `http://localhost:8000`.

## Como rodar o frontend (HTML)

Abra o arquivo `frontend/index.html` diretamente no navegador ou utilize um servidor simples:

```bash
cd frontend
python -m http.server 5500
```

Depois acesse `http://localhost:5500`.

### Modo mock (sem backend)

Para testar somente a UI no navegador, adicione `?mock=true` ao final da URL:

```
http://localhost:5500/?mock=true
```

Esse modo usa dados simulados e permite cadastrar, editar, movimentar e gerar sugestões sem o backend.
Também permite exportar a sugestão de compras em CSV diretamente do navegador.

## Acesso via celular na mesma rede

1. Descubra o IP do computador servidor (ex: `192.168.0.10`).
2. Inicie o backend com `--host 0.0.0.0`.
3. No celular, acesse `http://IP_DO_SERVIDOR:5500` para o frontend.

> Se necessário, ajuste a constante `API_URL` em `frontend/app.js` para apontar para o IP do servidor.

## Exportações

- Sugestão de compras (CSV):
  - `GET /export/purchase-suggestions.csv?dias=30`
  - No frontend, clique em **Exportar CSV**.

## Scripts de criação do banco

- `backend/init_db.py`: cria as tabelas SQLite.

## Endpoints principais

- `GET/POST/PUT/DELETE /items`
- `GET/POST /movements`
- `GET /dashboard`
- `GET /purchase-suggestions?dias=30`
- `GET /export/purchase-suggestions.csv?dias=30`
