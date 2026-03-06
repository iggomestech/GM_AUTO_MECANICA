from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models import Peca

pecas_bp = Blueprint('pecas', __name__)


@pecas_bp.route('/')
def listar():
    q = request.args.get('q', '').strip()
    query = Peca.query
    if q:
        query = query.filter(
            Peca.codigo.ilike(f'%{q}%') | Peca.descricao.ilike(f'%{q}%')
        )
    pecas = query.order_by(Peca.descricao).all()
    return render_template('pecas/listar.html', pecas=pecas, q=q)


@pecas_bp.route('/nova', methods=['GET', 'POST'])
def nova():
    if request.method == 'POST':
        codigo = request.form.get('codigo', '').strip()
        descricao = request.form.get('descricao', '').strip()
        quantidade = request.form.get('quantidade', 0, type=int)
        preco_custo = request.form.get('preco_custo', 0.0, type=float)
        preco_venda = request.form.get('preco_venda', 0.0, type=float)
        estoque_minimo = request.form.get('estoque_minimo', 1, type=int)

        if not codigo or not descricao:
            flash('Código e Descrição são obrigatórios.', 'danger')
            return render_template('pecas/form.html', peca=None)

        if Peca.query.filter_by(codigo=codigo).first():
            flash('Código já cadastrado.', 'danger')
            return render_template('pecas/form.html', peca=None)

        peca = Peca(
            codigo=codigo,
            descricao=descricao,
            quantidade=quantidade,
            preco_custo=preco_custo,
            preco_venda=preco_venda,
            estoque_minimo=estoque_minimo,
        )
        db.session.add(peca)
        db.session.commit()
        flash('Peça cadastrada com sucesso!', 'success')
        return redirect(url_for('pecas.listar'))

    return render_template('pecas/form.html', peca=None)


@pecas_bp.route('/<int:id>/editar', methods=['GET', 'POST'])
def editar(id):
    peca = Peca.query.get_or_404(id)
    if request.method == 'POST':
        codigo = request.form.get('codigo', '').strip()
        descricao = request.form.get('descricao', '').strip()
        quantidade = request.form.get('quantidade', 0, type=int)
        preco_custo = request.form.get('preco_custo', 0.0, type=float)
        preco_venda = request.form.get('preco_venda', 0.0, type=float)
        estoque_minimo = request.form.get('estoque_minimo', 1, type=int)

        if not codigo or not descricao:
            flash('Código e Descrição são obrigatórios.', 'danger')
            return render_template('pecas/form.html', peca=peca)

        existing = Peca.query.filter_by(codigo=codigo).first()
        if existing and existing.id != id:
            flash('Código já cadastrado para outra peça.', 'danger')
            return render_template('pecas/form.html', peca=peca)

        peca.codigo = codigo
        peca.descricao = descricao
        peca.quantidade = quantidade
        peca.preco_custo = preco_custo
        peca.preco_venda = preco_venda
        peca.estoque_minimo = estoque_minimo
        db.session.commit()
        flash('Peça atualizada com sucesso!', 'success')
        return redirect(url_for('pecas.listar'))

    return render_template('pecas/form.html', peca=peca)


@pecas_bp.route('/<int:id>/excluir', methods=['POST'])
def excluir(id):
    peca = Peca.query.get_or_404(id)
    db.session.delete(peca)
    db.session.commit()
    flash('Peça excluída com sucesso!', 'success')
    return redirect(url_for('pecas.listar'))
