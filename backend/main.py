from decimal import Decimal
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Controle de Matéria-Prima Industrial")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SEED_ITEMS = [
    {
        "sku": "ACO-001",
        "descricao": "Bobina de Aço Carbono",
        "unidade": "kg",
        "categoria": "Metais",
        "estoque_atual": Decimal("1200"),
        "estoque_minimo": Decimal("500"),
        "estoque_seguranca": Decimal("300"),
        "lead_time_dias": 10,
        "consumo_medio_diario": Decimal("40"),
    },
    {
        "sku": "POL-010",
        "descricao": "Polímero ABS",
        "unidade": "kg",
        "categoria": "Polímeros",
        "estoque_atual": Decimal("800"),
        "estoque_minimo": Decimal("300"),
        "estoque_seguranca": Decimal("200"),
        "lead_time_dias": 7,
        "consumo_medio_diario": Decimal("35"),
    },
    {
        "sku": "SOL-100",
        "descricao": "Solvente Industrial",
        "unidade": "L",
        "categoria": "Químicos",
        "estoque_atual": Decimal("150"),
        "estoque_minimo": Decimal("80"),
        "estoque_seguranca": Decimal("50"),
        "lead_time_dias": 5,
        "consumo_medio_diario": Decimal("12"),
    },
    {
        "sku": "EMB-050",
        "descricao": "Embalagem Plástica",
        "unidade": "cx",
        "categoria": "Embalagens",
        "estoque_atual": Decimal("60"),
        "estoque_minimo": Decimal("40"),
        "estoque_seguranca": Decimal("20"),
        "lead_time_dias": 3,
        "consumo_medio_diario": Decimal("5"),
    },
    {
        "sku": "PAR-007",
        "descricao": "Parafuso M8",
        "unidade": "un",
        "categoria": "Fixadores",
        "estoque_atual": Decimal("5000"),
        "estoque_minimo": Decimal("2000"),
        "estoque_seguranca": Decimal("1000"),
        "lead_time_dias": 14,
        "consumo_medio_diario": Decimal("150"),
    },
]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calcular_ponto_pedido(consumo_medio_diario: Decimal, lead_time_dias: int, estoque_seguranca: Decimal) -> Decimal:
    return (consumo_medio_diario * Decimal(lead_time_dias)) + estoque_seguranca


def calcular_status(estoque_atual: Decimal, ponto_pedido: Decimal, estoque_seguranca: Decimal) -> str:
    if estoque_atual <= estoque_seguranca:
        return "CRITICO"
    if estoque_atual <= ponto_pedido:
        return "ATENCAO"
    return "OK"


def atualizar_ponto_pedido(item: models.Item) -> None:
    item.ponto_pedido = calcular_ponto_pedido(
        consumo_medio_diario=item.consumo_medio_diario,
        lead_time_dias=item.lead_time_dias,
        estoque_seguranca=item.estoque_seguranca,
    )


def item_to_response(item: models.Item) -> schemas.ItemResponse:
    ponto_pedido = Decimal(item.ponto_pedido or 0)
    status = calcular_status(item.estoque_atual, ponto_pedido, item.estoque_seguranca)
    return schemas.ItemResponse(
        id=item.id,
        sku=item.sku,
        descricao=item.descricao,
        unidade=item.unidade,
        categoria=item.categoria,
        estoque_atual=item.estoque_atual,
        estoque_minimo=item.estoque_minimo,
        estoque_seguranca=item.estoque_seguranca,
        lead_time_dias=item.lead_time_dias,
        consumo_medio_diario=item.consumo_medio_diario,
        ponto_pedido=ponto_pedido,
        status=status,
    )


@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    try:
        existing = db.query(models.Item).count()
        if existing == 0:
            for payload in SEED_ITEMS:
                item = models.Item(**payload)
                atualizar_ponto_pedido(item)
                db.add(item)
            db.commit()
    finally:
        db.close()


@app.get("/items", response_model=List[schemas.ItemResponse])
def list_items(
    search: Optional[str] = None,
    status: Optional[str] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)
    if search:
        like_term = f"%{search.strip()}%"
        query = query.filter(
            (models.Item.sku.ilike(like_term)) | (models.Item.descricao.ilike(like_term))
        )
    if categoria:
        query = query.filter(models.Item.categoria == categoria)
    items = query.order_by(models.Item.sku).all()
    response = [item_to_response(item) for item in items]
    if status:
        response = [item for item in response if item.status == status]
    return response


@app.post("/items", response_model=schemas.ItemResponse)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Item).filter(models.Item.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU já cadastrado.")
    item = models.Item(**payload.dict())
    atualizar_ponto_pedido(item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_response(item)


@app.put("/items/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, payload: schemas.ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    if payload.sku != item.sku:
        existing = db.query(models.Item).filter(models.Item.sku == payload.sku).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU já cadastrado.")
    for key, value in payload.dict().items():
        setattr(item, key, value)
    atualizar_ponto_pedido(item)
    db.commit()
    db.refresh(item)
    return item_to_response(item)


@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    db.delete(item)
    db.commit()
    return {"message": "Item excluído com sucesso."}


@app.get("/movements", response_model=List[schemas.MovementResponse])
def list_movements(db: Session = Depends(get_db)):
    return db.query(models.Movement).order_by(models.Movement.data_hora.desc()).all()


def validar_quantidade(tipo: str, quantidade: Decimal) -> None:
    if tipo in {"ENTRADA", "SAIDA", "AJUSTE_ABSOLUTO"} and quantidade <= 0:
        raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero.")


@app.post("/movements", response_model=schemas.MovementResponse)
def create_movement(payload: schemas.MovementCreate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")

    validar_quantidade(payload.tipo, payload.quantidade)

    if payload.tipo == "ENTRADA":
        item.estoque_atual += payload.quantidade
    elif payload.tipo == "SAIDA":
        novo_estoque = item.estoque_atual - payload.quantidade
        if novo_estoque < 0:
            raise HTTPException(status_code=400, detail="Estoque não pode ficar negativo.")
        item.estoque_atual = novo_estoque
    elif payload.tipo == "AJUSTE_RELATIVO":
        novo_estoque = item.estoque_atual + payload.quantidade
        if novo_estoque < 0:
            raise HTTPException(status_code=400, detail="Estoque não pode ficar negativo.")
        item.estoque_atual = novo_estoque
    elif payload.tipo == "AJUSTE_ABSOLUTO":
        item.estoque_atual = payload.quantidade
    else:
        raise HTTPException(status_code=400, detail="Tipo de movimentação inválido.")

    atualizar_ponto_pedido(item)
    movement = models.Movement(**payload.dict())
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@app.get("/dashboard", response_model=schemas.DashboardResponse)
def dashboard(db: Session = Depends(get_db)):
    items = db.query(models.Item).order_by(models.Item.sku).all()
    response_items = [item_to_response(item) for item in items]
    criticos = sum(1 for item in response_items if item.status == "CRITICO")
    atencao = sum(1 for item in response_items if item.status == "ATENCAO")
    return schemas.DashboardResponse(
        total_itens=len(response_items),
        itens_atencao=atencao,
        itens_criticos=criticos,
        itens=response_items,
    )


def calcular_sugestoes(dias_cobertura: int, db: Session) -> List[schemas.PurchaseSuggestion]:
    items = db.query(models.Item).order_by(models.Item.sku).all()
    sugestoes = []
    for item in items:
        quantidade_sugerida = (item.consumo_medio_diario * Decimal(dias_cobertura)) - item.estoque_atual
        if quantidade_sugerida < 0:
            quantidade_sugerida = Decimal(0)
        sugestoes.append(
            schemas.PurchaseSuggestion(
                id=item.id,
                sku=item.sku,
                descricao=item.descricao,
                unidade=item.unidade,
                categoria=item.categoria,
                estoque_atual=item.estoque_atual,
                consumo_medio_diario=item.consumo_medio_diario,
                dias_cobertura=dias_cobertura,
                quantidade_sugerida=quantidade_sugerida,
            )
        )
    return sugestoes


@app.get("/purchase-suggestions", response_model=schemas.PurchaseSuggestionResponse)
def purchase_suggestions(dias: int = Query(30, ge=1), db: Session = Depends(get_db)):
    sugestoes = calcular_sugestoes(dias, db)
    return schemas.PurchaseSuggestionResponse(dias_cobertura=dias, sugestoes=sugestoes)


@app.get("/export/purchase-suggestions.csv")
def export_purchase_suggestions(dias: int = Query(30, ge=1), db: Session = Depends(get_db)):
    sugestoes = calcular_sugestoes(dias, db)
    headers = [
        "sku",
        "descricao",
        "unidade",
        "categoria",
        "estoque_atual",
        "consumo_medio_diario",
        "dias_cobertura",
        "quantidade_sugerida",
    ]

    def iter_lines():
        yield ";".join(headers) + "\n"
        for item in sugestoes:
            row = [
                item.sku,
                item.descricao,
                item.unidade,
                item.categoria or "",
                str(item.estoque_atual),
                str(item.consumo_medio_diario),
                str(item.dias_cobertura),
                str(item.quantidade_sugerida),
            ]
            yield ";".join(row) + "\n"

    filename = f"sugestao-compras-{dias}-dias.csv"
    return StreamingResponse(
        iter_lines(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
