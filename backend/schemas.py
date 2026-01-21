from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class ItemBase(BaseModel):
    sku: str
    descricao: str
    unidade: str
    categoria: Optional[str] = None
    estoque_atual: Decimal = Field(default=0)
    estoque_minimo: Decimal = Field(default=0)
    estoque_seguranca: Decimal = Field(default=0)
    lead_time_dias: int = Field(default=0)
    consumo_medio_diario: Decimal = Field(default=0)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id: int
    ponto_pedido: Decimal
    status: str

    class Config:
        orm_mode = True


class MovementBase(BaseModel):
    item_id: int
    tipo: str
    quantidade: Decimal
    responsavel: Optional[str] = None
    observacao: Optional[str] = None


class MovementCreate(MovementBase):
    pass


class MovementResponse(MovementBase):
    id: int
    data_hora: datetime

    class Config:
        orm_mode = True


class DashboardResponse(BaseModel):
    total_itens: int
    itens_atencao: int
    itens_criticos: int
    itens: List[ItemResponse]


class PurchaseSuggestion(BaseModel):
    id: int
    sku: str
    descricao: str
    unidade: str
    categoria: Optional[str]
    estoque_atual: Decimal
    consumo_medio_diario: Decimal
    dias_cobertura: int
    quantidade_sugerida: Decimal


class PurchaseSuggestionResponse(BaseModel):
    dias_cobertura: int
    sugestoes: List[PurchaseSuggestion]
