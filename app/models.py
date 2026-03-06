from app import db
from datetime import datetime


class Cliente(db.Model):
    __tablename__ = 'clientes'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    cpf_cnpj = db.Column(db.String(20), unique=True, nullable=False)
    telefone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    endereco = db.Column(db.String(200))
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    veiculos = db.relationship('Veiculo', backref='cliente', lazy=True, cascade='all, delete-orphan')
    ordens = db.relationship('OrdemServico', backref='cliente', lazy=True)

    def __repr__(self):
        return f'<Cliente {self.nome}>'


class Veiculo(db.Model):
    __tablename__ = 'veiculos'

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    marca = db.Column(db.String(50), nullable=False)
    modelo = db.Column(db.String(80), nullable=False)
    ano = db.Column(db.Integer, nullable=False)
    placa = db.Column(db.String(10), unique=True, nullable=False)
    cor = db.Column(db.String(30))
    chassi = db.Column(db.String(50))
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    ordens = db.relationship('OrdemServico', backref='veiculo', lazy=True)

    def __repr__(self):
        return f'<Veiculo {self.placa}>'


class Peca(db.Model):
    __tablename__ = 'pecas'

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    quantidade = db.Column(db.Integer, default=0, nullable=False)
    preco_custo = db.Column(db.Numeric(10, 2), nullable=False)
    preco_venda = db.Column(db.Numeric(10, 2), nullable=False)
    estoque_minimo = db.Column(db.Integer, default=1)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Peca {self.codigo}>'


class OrdemServico(db.Model):
    __tablename__ = 'ordens_servico'

    STATUS_ABERTA = 'Aberta'
    STATUS_EM_ANDAMENTO = 'Em Andamento'
    STATUS_AGUARDANDO_PECA = 'Aguardando Peça'
    STATUS_CONCLUIDA = 'Concluída'
    STATUS_CANCELADA = 'Cancelada'

    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    veiculo_id = db.Column(db.Integer, db.ForeignKey('veiculos.id'), nullable=False)
    descricao_problema = db.Column(db.Text, nullable=False)
    servicos_realizados = db.Column(db.Text)
    status = db.Column(db.String(30), default=STATUS_ABERTA, nullable=False)
    valor_servico = db.Column(db.Numeric(10, 2), default=0)
    valor_pecas = db.Column(db.Numeric(10, 2), default=0)
    valor_total = db.Column(db.Numeric(10, 2), default=0)
    quilometragem = db.Column(db.Integer)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    concluido_em = db.Column(db.DateTime)

    itens = db.relationship('ItemOrdem', backref='ordem', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<OrdemServico {self.numero}>'


class ItemOrdem(db.Model):
    __tablename__ = 'itens_ordem'

    id = db.Column(db.Integer, primary_key=True)
    ordem_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    peca_id = db.Column(db.Integer, db.ForeignKey('pecas.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    preco_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    peca = db.relationship('Peca')

    def __repr__(self):
        return f'<ItemOrdem ordem={self.ordem_id} peca={self.peca_id}>'
