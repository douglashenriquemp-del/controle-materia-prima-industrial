from database import Base, engine
import models


def main():
    Base.metadata.create_all(bind=engine)
    print("Banco de dados inicializado com sucesso.")


if __name__ == "__main__":
    main()
