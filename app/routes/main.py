from flask import Blueprint, render_template
from app.models import Cliente, Veiculo, OrdemServico, Peca

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    total_clientes = Cliente.query.count()
    total_veiculos = Veiculo.query.count()
    ordens_abertas = OrdemServico.query.filter(
        OrdemServico.status.in_([
            OrdemServico.STATUS_ABERTA,
            OrdemServico.STATUS_EM_ANDAMENTO,
            OrdemServico.STATUS_AGUARDANDO_PECA
        ])
    ).count()
    pecas_baixo_estoque = Peca.query.filter(
        Peca.quantidade <= Peca.estoque_minimo
    ).count()
    ordens_recentes = OrdemServico.query.order_by(
        OrdemServico.criado_em.desc()
    ).limit(5).all()
    return render_template(
        'index.html',
        total_clientes=total_clientes,
        total_veiculos=total_veiculos,
        ordens_abertas=ordens_abertas,
        pecas_baixo_estoque=pecas_baixo_estoque,
        ordens_recentes=ordens_recentes,
    )
