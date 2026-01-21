from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, nullable=False, index=True)
    descricao = Column(String, nullable=False)
    unidade = Column(String, nullable=False, default="un")
    categoria = Column(String, nullable=True)
    estoque_atual = Column(Numeric(14, 2), nullable=False, default=0)
    estoque_minimo = Column(Numeric(14, 2), nullable=False, default=0)
    estoque_seguranca = Column(Numeric(14, 2), nullable=False, default=0)
    lead_time_dias = Column(Integer, nullable=False, default=0)
    consumo_medio_diario = Column(Numeric(14, 2), nullable=False, default=0)
    ponto_pedido = Column(Numeric(14, 2), nullable=False, default=0)

    movements = relationship("Movement", back_populates="item", cascade="all, delete")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    tipo = Column(
        Enum("ENTRADA", "SAIDA", "AJUSTE_RELATIVO", "AJUSTE_ABSOLUTO", name="movement_type"),
        nullable=False,
    )
    quantidade = Column(Numeric(14, 2), nullable=False)
    data_hora = Column(DateTime(timezone=True), server_default=func.now())
    responsavel = Column(String, nullable=True)
    observacao = Column(String, nullable=True)

    item = relationship("Item", back_populates="movements")
