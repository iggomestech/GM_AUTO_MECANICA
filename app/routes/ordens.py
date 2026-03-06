from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models import OrdemServico, Cliente, Veiculo, Peca, ItemOrdem
from datetime import datetime

ordens_bp = Blueprint('ordens', __name__)


def _gerar_numero():
    ultima = OrdemServico.query.order_by(OrdemServico.id.desc()).first()
    proximo = (ultima.id + 1) if ultima else 1
    return f'OS{proximo:05d}'


@ordens_bp.route('/')
def listar():
    status = request.args.get('status', '').strip()
    q = request.args.get('q', '').strip()
    query = OrdemServico.query
    if status:
        query = query.filter(OrdemServico.status == status)
    if q:
        query = query.filter(OrdemServico.numero.ilike(f'%{q}%'))
    ordens = query.order_by(OrdemServico.criado_em.desc()).all()
    statuses = [
        OrdemServico.STATUS_ABERTA,
        OrdemServico.STATUS_EM_ANDAMENTO,
        OrdemServico.STATUS_AGUARDANDO_PECA,
        OrdemServico.STATUS_CONCLUIDA,
        OrdemServico.STATUS_CANCELADA,
    ]
    return render_template('ordens/listar.html', ordens=ordens, statuses=statuses,
                           status_sel=status, q=q)


@ordens_bp.route('/nova', methods=['GET', 'POST'])
def nova():
    clientes = Cliente.query.order_by(Cliente.nome).all()
    veiculos = Veiculo.query.order_by(Veiculo.placa).all()
    if request.method == 'POST':
        cliente_id = request.form.get('cliente_id', type=int)
        veiculo_id = request.form.get('veiculo_id', type=int)
        descricao_problema = request.form.get('descricao_problema', '').strip()
        quilometragem = request.form.get('quilometragem', type=int)
        observacoes = request.form.get('observacoes', '').strip()
        valor_servico = request.form.get('valor_servico', 0.0, type=float)

        if not cliente_id or not veiculo_id or not descricao_problema:
            flash('Cliente, Veículo e Descrição do Problema são obrigatórios.', 'danger')
            return render_template('ordens/form.html', ordem=None,
                                   clientes=clientes, veiculos=veiculos, pecas=[])

        numero = _gerar_numero()
        ordem = OrdemServico(
            numero=numero,
            cliente_id=cliente_id,
            veiculo_id=veiculo_id,
            descricao_problema=descricao_problema,
            quilometragem=quilometragem,
            observacoes=observacoes,
            valor_servico=valor_servico,
            valor_total=valor_servico,
        )
        db.session.add(ordem)
        db.session.commit()
        flash(f'Ordem de Serviço {numero} criada com sucesso!', 'success')
        return redirect(url_for('ordens.detalhar', id=ordem.id))

    return render_template('ordens/form.html', ordem=None,
                           clientes=clientes, veiculos=veiculos, pecas=[])


@ordens_bp.route('/<int:id>')
def detalhar(id):
    ordem = OrdemServico.query.get_or_404(id)
    pecas = Peca.query.order_by(Peca.descricao).all()
    return render_template('ordens/detalhar.html', ordem=ordem, pecas=pecas)


@ordens_bp.route('/<int:id>/editar', methods=['GET', 'POST'])
def editar(id):
    ordem = OrdemServico.query.get_or_404(id)
    clientes = Cliente.query.order_by(Cliente.nome).all()
    veiculos = Veiculo.query.order_by(Veiculo.placa).all()

    if request.method == 'POST':
        cliente_id = request.form.get('cliente_id', type=int)
        veiculo_id = request.form.get('veiculo_id', type=int)
        descricao_problema = request.form.get('descricao_problema', '').strip()
        servicos_realizados = request.form.get('servicos_realizados', '').strip()
        status = request.form.get('status', '').strip()
        quilometragem = request.form.get('quilometragem', type=int)
        observacoes = request.form.get('observacoes', '').strip()
        valor_servico = request.form.get('valor_servico', 0.0, type=float)

        if not cliente_id or not veiculo_id or not descricao_problema:
            flash('Cliente, Veículo e Descrição do Problema são obrigatórios.', 'danger')
            return render_template('ordens/form.html', ordem=ordem,
                                   clientes=clientes, veiculos=veiculos)

        ordem.cliente_id = cliente_id
        ordem.veiculo_id = veiculo_id
        ordem.descricao_problema = descricao_problema
        ordem.servicos_realizados = servicos_realizados
        ordem.status = status
        ordem.quilometragem = quilometragem
        ordem.observacoes = observacoes
        ordem.valor_servico = valor_servico
        ordem.atualizado_em = datetime.utcnow()

        if status == OrdemServico.STATUS_CONCLUIDA and not ordem.concluido_em:
            ordem.concluido_em = datetime.utcnow()

        _recalcular_total(ordem)
        db.session.commit()
        flash('Ordem de Serviço atualizada com sucesso!', 'success')
        return redirect(url_for('ordens.detalhar', id=ordem.id))

    return render_template('ordens/form.html', ordem=ordem,
                           clientes=clientes, veiculos=veiculos)


@ordens_bp.route('/<int:id>/adicionar_peca', methods=['POST'])
def adicionar_peca(id):
    ordem = OrdemServico.query.get_or_404(id)
    peca_id = request.form.get('peca_id', type=int)
    quantidade = request.form.get('quantidade', 1, type=int)

    if not peca_id or quantidade < 1:
        flash('Selecione uma peça e informe a quantidade.', 'danger')
        return redirect(url_for('ordens.detalhar', id=id))

    peca = Peca.query.get_or_404(peca_id)

    if peca.quantidade < quantidade:
        flash(f'Estoque insuficiente. Disponível: {peca.quantidade} unidade(s).', 'danger')
        return redirect(url_for('ordens.detalhar', id=id))

    preco_unitario = float(peca.preco_venda)
    subtotal = preco_unitario * quantidade

    item = ItemOrdem(
        ordem_id=id,
        peca_id=peca_id,
        quantidade=quantidade,
        preco_unitario=preco_unitario,
        subtotal=subtotal,
    )
    peca.quantidade -= quantidade
    db.session.add(item)
    _recalcular_total(ordem)
    db.session.commit()
    flash('Peça adicionada à ordem com sucesso!', 'success')
    return redirect(url_for('ordens.detalhar', id=id))


@ordens_bp.route('/<int:id>/remover_peca/<int:item_id>', methods=['POST'])
def remover_peca(id, item_id):
    item = ItemOrdem.query.get_or_404(item_id)
    ordem = OrdemServico.query.get_or_404(id)
    peca = Peca.query.get(item.peca_id)
    if peca:
        peca.quantidade += item.quantidade
    db.session.delete(item)
    _recalcular_total(ordem)
    db.session.commit()
    flash('Peça removida da ordem com sucesso!', 'success')
    return redirect(url_for('ordens.detalhar', id=id))


@ordens_bp.route('/<int:id>/excluir', methods=['POST'])
def excluir(id):
    ordem = OrdemServico.query.get_or_404(id)
    for item in ordem.itens:
        peca = Peca.query.get(item.peca_id)
        if peca:
            peca.quantidade += item.quantidade
    db.session.delete(ordem)
    db.session.commit()
    flash('Ordem de Serviço excluída com sucesso!', 'success')
    return redirect(url_for('ordens.listar'))


def _recalcular_total(ordem):
    valor_pecas = sum(float(item.subtotal) for item in ordem.itens)
    ordem.valor_pecas = valor_pecas
    ordem.valor_total = float(ordem.valor_servico or 0) + valor_pecas
