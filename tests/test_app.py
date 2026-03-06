import pytest
from app import create_app, db as _db
from app.models import Cliente, Veiculo, Peca, OrdemServico


@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret',
    })
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_cliente(app):
    with app.app_context():
        c = Cliente(nome='João Silva', cpf_cnpj='123.456.789-00',
                    telefone='(11) 99999-0000', email='joao@example.com')
        _db.session.add(c)
        _db.session.commit()
        return c.id


@pytest.fixture
def sample_veiculo(app, sample_cliente):
    with app.app_context():
        v = Veiculo(cliente_id=sample_cliente, marca='Fiat', modelo='Uno',
                    ano=2015, placa='ABC1234', cor='Branco')
        _db.session.add(v)
        _db.session.commit()
        return v.id


@pytest.fixture
def sample_peca(app):
    with app.app_context():
        p = Peca(codigo='OL-001', descricao='Óleo Motor 5W30',
                 quantidade=10, preco_custo=25.00, preco_venda=45.00, estoque_minimo=2)
        _db.session.add(p)
        _db.session.commit()
        return p.id


# ===== Dashboard =====

def test_dashboard(client):
    r = client.get('/')
    assert r.status_code == 200
    assert 'GM Auto Mecânica'.encode() in r.data or b'GM Auto' in r.data


# ===== Clientes =====

def test_listar_clientes_vazio(client):
    r = client.get('/clientes/')
    assert r.status_code == 200


def test_criar_cliente(client):
    r = client.post('/clientes/novo', data={
        'nome': 'Maria Costa', 'cpf_cnpj': '987.654.321-00',
        'telefone': '(21) 98888-1111', 'email': '', 'endereco': ''
    }, follow_redirects=True)
    assert r.status_code == 200
    assert 'Maria Costa'.encode() in r.data


def test_criar_cliente_sem_campos_obrigatorios(client):
    r = client.post('/clientes/novo', data={
        'nome': '', 'cpf_cnpj': '', 'telefone': ''
    }, follow_redirects=True)
    assert b'obrigat' in r.data


def test_criar_cliente_cpf_duplicado(client, sample_cliente):
    r = client.post('/clientes/novo', data={
        'nome': 'Outro', 'cpf_cnpj': '123.456.789-00', 'telefone': '99999'
    }, follow_redirects=True)
    assert b'cadastrado' in r.data


def test_editar_cliente(client, sample_cliente):
    r = client.post(f'/clientes/{sample_cliente}/editar', data={
        'nome': 'João Atualizado', 'cpf_cnpj': '123.456.789-00',
        'telefone': '(11) 77777-0000', 'email': '', 'endereco': ''
    }, follow_redirects=True)
    assert r.status_code == 200
    assert 'João Atualizado'.encode() in r.data


def test_excluir_cliente(client, sample_cliente):
    r = client.post(f'/clientes/{sample_cliente}/excluir', follow_redirects=True)
    assert r.status_code == 200


def test_detalhar_cliente(client, sample_cliente):
    r = client.get(f'/clientes/{sample_cliente}')
    assert r.status_code == 200
    assert 'João Silva'.encode() in r.data


def test_buscar_cliente(client, sample_cliente):
    r = client.get('/clientes/?q=João')
    assert r.status_code == 200
    assert 'João Silva'.encode() in r.data


# ===== Veículos =====

def test_listar_veiculos(client):
    r = client.get('/veiculos/')
    assert r.status_code == 200


def test_criar_veiculo(client, sample_cliente):
    r = client.post('/veiculos/novo', data={
        'cliente_id': sample_cliente, 'marca': 'Chevrolet', 'modelo': 'Onix',
        'ano': 2022, 'placa': 'XYZ9999', 'cor': 'Prata', 'chassi': ''
    }, follow_redirects=True)
    assert r.status_code == 200
    assert b'XYZ9999' in r.data


def test_criar_veiculo_placa_duplicada(client, sample_veiculo, sample_cliente):
    r = client.post('/veiculos/novo', data={
        'cliente_id': sample_cliente, 'marca': 'VW', 'modelo': 'Gol',
        'ano': 2018, 'placa': 'ABC1234', 'cor': 'Preto', 'chassi': ''
    }, follow_redirects=True)
    assert b'cadastrada' in r.data


def test_detalhar_veiculo(client, sample_veiculo):
    r = client.get(f'/veiculos/{sample_veiculo}')
    assert r.status_code == 200


def test_excluir_veiculo(client, sample_veiculo):
    r = client.post(f'/veiculos/{sample_veiculo}/excluir', follow_redirects=True)
    assert r.status_code == 200


# ===== Peças =====

def test_listar_pecas(client):
    r = client.get('/pecas/')
    assert r.status_code == 200


def test_criar_peca(client):
    r = client.post('/pecas/nova', data={
        'codigo': 'FLT-001', 'descricao': 'Filtro de Óleo',
        'quantidade': 5, 'preco_custo': 15.00, 'preco_venda': 30.00, 'estoque_minimo': 2
    }, follow_redirects=True)
    assert r.status_code == 200
    assert b'FLT-001' in r.data


def test_criar_peca_codigo_duplicado(client, sample_peca):
    r = client.post('/pecas/nova', data={
        'codigo': 'OL-001', 'descricao': 'Outra', 'quantidade': 1,
        'preco_custo': 10, 'preco_venda': 20, 'estoque_minimo': 1
    }, follow_redirects=True)
    assert b'cadastrado' in r.data


def test_editar_peca(client, sample_peca):
    r = client.post(f'/pecas/{sample_peca}/editar', data={
        'codigo': 'OL-001', 'descricao': 'Óleo Motor 10W40',
        'quantidade': 8, 'preco_custo': 22.00, 'preco_venda': 42.00, 'estoque_minimo': 2
    }, follow_redirects=True)
    assert r.status_code == 200


def test_excluir_peca(client, sample_peca):
    r = client.post(f'/pecas/{sample_peca}/excluir', follow_redirects=True)
    assert r.status_code == 200


# ===== Ordens de Serviço =====

def test_listar_ordens(client):
    r = client.get('/ordens/')
    assert r.status_code == 200


def test_criar_ordem(client, sample_cliente, sample_veiculo):
    r = client.post('/ordens/nova', data={
        'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
        'descricao_problema': 'Troca de óleo', 'quilometragem': 50000,
        'observacoes': '', 'valor_servico': 80.00
    }, follow_redirects=True)
    assert r.status_code == 200
    assert b'OS00001' in r.data


def test_criar_ordem_sem_campos(client):
    r = client.post('/ordens/nova', data={
        'cliente_id': '', 'veiculo_id': '', 'descricao_problema': ''
    }, follow_redirects=True)
    assert b'obrigat' in r.data


def test_adicionar_peca_ordem(client, sample_cliente, sample_veiculo, sample_peca, app):
    with app.app_context():
        client.post('/ordens/nova', data={
            'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
            'descricao_problema': 'Revisão', 'valor_servico': 0
        }, follow_redirects=True)
        ordem = OrdemServico.query.first()
        r = client.post(f'/ordens/{ordem.id}/adicionar_peca', data={
            'peca_id': sample_peca, 'quantidade': 2
        }, follow_redirects=True)
        assert r.status_code == 200
        peca = Peca.query.get(sample_peca)
        assert peca.quantidade == 8  # 10 - 2


def test_adicionar_peca_estoque_insuficiente(client, sample_cliente, sample_veiculo, sample_peca, app):
    with app.app_context():
        client.post('/ordens/nova', data={
            'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
            'descricao_problema': 'Revisão', 'valor_servico': 0
        }, follow_redirects=True)
        ordem = OrdemServico.query.first()
        r = client.post(f'/ordens/{ordem.id}/adicionar_peca', data={
            'peca_id': sample_peca, 'quantidade': 999
        }, follow_redirects=True)
        assert b'insuficiente' in r.data


def test_editar_ordem_status(client, sample_cliente, sample_veiculo, app):
    with app.app_context():
        client.post('/ordens/nova', data={
            'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
            'descricao_problema': 'Alinhamento', 'valor_servico': 120
        }, follow_redirects=True)
        ordem = OrdemServico.query.first()
        r = client.post(f'/ordens/{ordem.id}/editar', data={
            'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
            'descricao_problema': 'Alinhamento', 'servicos_realizados': 'Feito',
            'status': 'Concluída', 'quilometragem': 60000,
            'observacoes': '', 'valor_servico': 120
        }, follow_redirects=True)
        assert r.status_code == 200
        ordem_db = OrdemServico.query.get(ordem.id)
        assert ordem_db.status == 'Concluída'


def test_excluir_ordem(client, sample_cliente, sample_veiculo, app):
    with app.app_context():
        client.post('/ordens/nova', data={
            'cliente_id': sample_cliente, 'veiculo_id': sample_veiculo,
            'descricao_problema': 'Freios', 'valor_servico': 200
        }, follow_redirects=True)
        ordem = OrdemServico.query.first()
        r = client.post(f'/ordens/{ordem.id}/excluir', follow_redirects=True)
        assert r.status_code == 200
        assert OrdemServico.query.count() == 0
