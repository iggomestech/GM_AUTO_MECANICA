# GM Auto Mecânica – Sistema de Gestão

Sistema web desenvolvido para automação de parte da operação da **GM Auto Mecânica**.

## Funcionalidades

- **Dashboard** com resumo de clientes, veículos, ordens em aberto e estoque baixo
- **Gestão de Clientes** – cadastro, edição, busca e exclusão
- **Gestão de Veículos** – vinculados a clientes, histórico de serviços por veículo
- **Ordens de Serviço (OS)** – abertura, acompanhamento de status, adição de peças e cálculo automático de valores
- **Estoque de Peças** – controle de quantidade, preço de custo/venda e alerta de estoque mínimo

## Tecnologias

- Python 3.12 + Flask
- SQLAlchemy + SQLite
- HTML/CSS (sem dependências externas de front-end)

## Instalação e execução

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Iniciar o servidor
python run.py
```

Acesse [http://localhost:5000](http://localhost:5000) no navegador.

## Testes

```bash
pytest tests/
```

## Estrutura do projeto

```
app/
  __init__.py        # Fábrica da aplicação Flask
  models.py          # Modelos do banco de dados
  routes/
    main.py          # Dashboard
    clientes.py      # CRUD de clientes
    veiculos.py      # CRUD de veículos
    ordens.py        # Ordens de serviço
    pecas.py         # Estoque de peças
  templates/         # Templates HTML
  static/css/        # Folha de estilos
run.py               # Ponto de entrada
tests/               # Testes automatizados
requirements.txt
```

